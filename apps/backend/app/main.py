import json
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any, Literal, cast

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from app.catalog_prompt import CATALOG_PROMPT
from app.security import (
    MAX_CHARS_PER_MESSAGE,
    MAX_MESSAGES,
    MAX_OUTPUT_TOKENS,
    MAX_TOTAL_CHARS,
    RateLimitMiddleware,
    get_client_ip,
    is_ai_disabled,
    verify_turnstile_token,
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class BranchFocus(BaseModel):
    selected_text: str = Field(min_length=1)
    parent_window_title: str = Field(min_length=1)
    parent_message_role: Literal["user", "assistant"]


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    branch_focus: BranchFocus | None = None
    model: str | None = Field(default=None, min_length=1)
    turnstile_token: str | None = None


def encode_line(payload: dict[str, str]) -> bytes:
    return f"{json.dumps(payload)}\n".encode("utf-8")


def build_instructions(branch_focus: BranchFocus | None) -> str:
    instructions = (
        "You are continuing an existing chat conversation. "
        "Respond naturally and keep the answer grounded in the transcript."
        f"\n\n{CATALOG_PROMPT}"
    )

    if branch_focus is None:
        return instructions

    return (
        f"{instructions}\n\n"
        "This chat was branched from a selected phrase in another window. "
        f"The selected phrase came from a {branch_focus.parent_message_role} message in "
        f"{branch_focus.parent_window_title}. "
        f"Treat the following excerpt as the branch focus while answering follow-up prompts:\n"
        f"{json.dumps(branch_focus.selected_text)}"
    )


def build_input(messages: list[ChatMessage]) -> list[dict[str, str]]:
    return [
        {
            "role": message.role,
            "content": message.content,
        }
        for message in messages
    ]


def parse_model_options(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []

    options: list[str] = []

    for token in raw_value.split(","):
        model = token.strip()
        if not model or model in options:
            continue
        options.append(model)

    return options


def get_model_config() -> tuple[list[str], str | None]:
    options = parse_model_options(os.getenv("OPENAI_MODEL_OPTIONS"))
    default_model = (os.getenv("OPENAI_MODEL") or "").strip() or None

    if not options:
        return ([default_model] if default_model else []), default_model

    if default_model and default_model in options:
        return options, default_model

    return options, options[0]


def resolve_model_name(payload_model: str | None) -> tuple[str | None, str | None]:
    options, default_model = get_model_config()
    requested_model = payload_model.strip() if payload_model else None

    if requested_model:
        if options and requested_model not in options:
            return (
                None,
                f"Model {json.dumps(requested_model)} is not available on the backend.",
            )
        return requested_model, None

    if default_model:
        return default_model, None

    return None, "No model configured. Set OPENAI_MODEL or OPENAI_MODEL_OPTIONS."


def get_client(app: FastAPI) -> AsyncOpenAI | None:
    if getattr(app.state, "openai_client", None) is not None:
        return app.state.openai_client

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    client = AsyncOpenAI(api_key=api_key)
    app.state.openai_client = client
    return client


def validate_request_size(payload: ChatRequest) -> str | None:
    """Validate message count and character limits. Returns error string or None."""
    if len(payload.messages) > MAX_MESSAGES:
        return f"Too many messages. Maximum is {MAX_MESSAGES}."

    total_chars = 0
    for message in payload.messages:
        msg_len = len(message.content)
        if msg_len > MAX_CHARS_PER_MESSAGE:
            return f"Message too long ({msg_len} chars). Maximum is {MAX_CHARS_PER_MESSAGE} per message."
        total_chars += msg_len

    if total_chars > MAX_TOTAL_CHARS:
        return f"Total message content too long ({total_chars} chars). Maximum is {MAX_TOTAL_CHARS}."

    return None


def trim_history(
    messages: list[ChatMessage], max_chars: int = MAX_TOTAL_CHARS
) -> list[ChatMessage]:
    """Keep the most recent messages that fit within max_chars total.

    Always preserves the last message (the user's new prompt).
    """
    if not messages:
        return messages

    # Always keep the last message
    result: list[ChatMessage] = [messages[-1]]
    remaining = max_chars - len(messages[-1].content)

    # Walk backwards from second-to-last, adding messages while budget remains
    for message in reversed(messages[:-1]):
        msg_len = len(message.content)
        if remaining - msg_len < 0:
            break
        result.insert(0, message)
        remaining -= msg_len

    return result


async def stream_chat_response(app: FastAPI, payload: ChatRequest) -> AsyncIterator[bytes]:
    client = get_client(app)
    model, model_error = resolve_model_name(payload.model)

    if client is None:
        yield encode_line(
            {
                "type": "error",
                "message": "OPENAI_API_KEY is not set on the backend.",
            }
        )
        return

    if model_error:
        yield encode_line(
            {
                "type": "error",
                "message": model_error,
            }
        )
        return

    if model is None:
        yield encode_line(
            {
                "type": "error",
                "message": "No model configured. Set OPENAI_MODEL or OPENAI_MODEL_OPTIONS.",
            }
        )
        return

    # Trim history to stay within token budget
    trimmed_messages = trim_history(payload.messages)

    done_sent = False

    try:
        stream = await client.responses.create(
            model=model,
            input=cast(Any, build_input(trimmed_messages)),
            instructions=build_instructions(payload.branch_focus),
            stream=True,
            max_output_tokens=MAX_OUTPUT_TOKENS,
        )

        async for event in stream:
            if event.type == "response.output_text.delta" and event.delta:
                yield encode_line({"type": "delta", "text": event.delta})
            elif event.type == "response.completed":
                yield encode_line({"type": "done"})
                done_sent = True
            elif event.type == "error":
                message = getattr(getattr(event, "error", None), "message", None)
                yield encode_line(
                    {
                        "type": "error",
                        "message": message or "The model stream failed.",
                    }
                )
                return
    except Exception as exc:
        yield encode_line({"type": "error", "message": str(exc)})
        return

    if not done_sent:
        yield encode_line({"type": "done"})


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.openai_client = None
    yield
    client = getattr(app.state, "openai_client", None)
    if client is not None:
        await client.close()


app = FastAPI(title="Sidequest API", lifespan=lifespan)

# --- Middleware stack ---
# Starlette wraps in reverse registration order, so the LAST added
# middleware is the OUTERMOST.  We want: CORS(RateLimit(app)) so that
# 429 responses from the rate limiter still get CORS headers.

# 1. Register rate-limit middleware first (inner)
app.add_middleware(RateLimitMiddleware)

# 2. Register CORS middleware second (outer — wraps rate-limit)
_cors_origins_raw = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
_cors_origins = (
    [origin.strip() for origin in _cors_origins_raw.split(",") if origin.strip()]
    if _cors_origins_raw
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat/stream", response_model=None)
async def chat_stream(
    payload: ChatRequest, request: Request
) -> StreamingResponse | JSONResponse:
    # Circuit breaker
    if is_ai_disabled():
        return JSONResponse(
            status_code=503,
            content={
                "detail": "AI features are temporarily disabled. Please try again later.",
            },
        )

    # Turnstile verification
    client_ip = get_client_ip(request)
    if not await verify_turnstile_token(payload.turnstile_token or "", client_ip):
        return JSONResponse(
            status_code=403,
            content={
                "detail": "Captcha verification failed. Please refresh and try again.",
            },
        )

    # Request size validation
    size_error = validate_request_size(payload)
    if size_error:
        return JSONResponse(
            status_code=422,
            content={"detail": size_error},
        )

    return StreamingResponse(
        stream_chat_response(app, payload),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/api/chat/models")
async def chat_models() -> dict[str, object]:
    models, default_model = get_model_config()
    return {
        "models": models,
        "default_model": default_model,
    }
