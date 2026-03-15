import json
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from inspect import signature
from pathlib import Path
from typing import Any, Literal, cast

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from app.catalog_prompt import CATALOG_PROMPT

ReasoningEffort = Literal["none", "minimal", "low", "medium", "high", "xhigh"]
REPO_ROOT = Path(__file__).resolve().parents[3]
ENV_FILES = (REPO_ROOT / ".env", Path(__file__).resolve().parents[1] / ".env")
logger = logging.getLogger(__name__)
VISUALIZATION_HINTS = (
    "visualize",
    "visualization",
    "interactive",
    "diagram",
    "simulation",
    "explainer",
    "render",
    "animate",
    "tree",
    "graph",
    "chart",
    "build a ui",
    "build an interactive",
    "build a visual",
)


def load_env_files() -> list[Path]:
    loaded_files: list[Path] = []

    for env_file in ENV_FILES:
        if not env_file.is_file():
            continue

        if load_dotenv(env_file, override=False):
            loaded_files.append(env_file)

    return loaded_files


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
    effort: ReasoningEffort | None = None


def encode_line(payload: dict[str, object]) -> bytes:
    return f"{json.dumps(payload)}\n".encode("utf-8")


def should_force_iframe(messages: list[ChatMessage]) -> bool:
    latest_user_message = next(
        (message.content for message in reversed(messages) if message.role == "user"),
        "",
    )
    normalized = latest_user_message.lower()
    return any(hint in normalized for hint in VISUALIZATION_HINTS)


def build_instructions(
    branch_focus: BranchFocus | None,
    force_iframe: bool = False,
) -> str:
    instructions = (
        "You are continuing an existing chat conversation. "
        "Respond naturally and keep the answer grounded in the transcript."
        f"\n\n{CATALOG_PROMPT}"
    )

    if force_iframe:
        instructions = (
            f"{instructions}\n\n"
            "This request is a visualization request. "
            "You must respond with normal prose plus at least one ```iframe code fence. "
            "Do not emit any ```jsonrender fence for this request. "
            "If you need a custom visual, interactive demo, explainer, diagram, or simulation, "
            "the only allowed interactive output format is ```iframe."
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


def build_transcript_prompt(messages: list[ChatMessage]) -> str:
    transcript = "\n".join(
        f"{message.role.upper()}: {message.content}" for message in messages
    )

    return (
        "Continue this conversation as the assistant. "
        "Answer the final user message naturally and stay grounded in the transcript."
        "\n\n<conversation>\n"
        f"{transcript}\n"
        "</conversation>"
    )


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
    options = parse_model_options(os.getenv("ANTHROPIC_MODEL_OPTIONS"))
    default_model = (os.getenv("ANTHROPIC_MODEL") or "").strip() or None

    if not options:
        return ([default_model] if default_model else []), default_model

    if default_model and default_model in options:
        return options, default_model

    return options, options[0]


def build_model_option(model_name: str) -> dict[str, object]:
    return {
        "id": model_name,
        "efforts": [],
        "default_effort": None,
    }


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

    return None, "No model configured. Set ANTHROPIC_MODEL or ANTHROPIC_MODEL_OPTIONS."


def resolve_effort(
    model: str,
    payload_effort: ReasoningEffort | None,
) -> tuple[ReasoningEffort | None, str | None]:
    if payload_effort is not None:
        return (
            None,
            (
                f"Model {json.dumps(model)} does not support effort "
                f"{json.dumps(payload_effort)}."
            ),
        )

    return None, None


def get_query_fn(app: FastAPI):
    existing = getattr(app.state, "anthropic_query_fn", None)
    if existing is not None:
        return existing

    try:
        from claude_agent_sdk import ClaudeAgentOptions, query
    except ImportError as exc:
        raise RuntimeError(
            "claude-agent-sdk is not installed on the backend."
        ) from exc

    option_names = set(signature(ClaudeAgentOptions).parameters)

    def run_query(*, prompt: str, instructions: str, model: str):
        option_kwargs: dict[str, object] = {}

        if "system_prompt" in option_names:
            option_kwargs["system_prompt"] = instructions
        if "max_turns" in option_names:
            option_kwargs["max_turns"] = 1
        if "cwd" in option_names:
            option_kwargs["cwd"] = os.getcwd()
        if "allowed_tools" in option_names:
            option_kwargs["allowed_tools"] = []
        if "env" in option_names:
            option_kwargs["env"] = {"ANTHROPIC_MODEL": model}

        options = ClaudeAgentOptions(**option_kwargs)
        return query(prompt=prompt, options=options)

    app.state.anthropic_query_fn = run_query
    return run_query


def iter_message_blocks(message: object) -> list[object]:
    content = getattr(message, "content", None)
    if isinstance(content, list):
        return list(content)
    return []


def extract_reasoning_text(block: object) -> str | None:
    for attribute in ("thinking", "text"):
        value = getattr(block, attribute, None)
        if isinstance(value, str) and value:
            block_type = str(getattr(block, "type", "")).lower()
            class_name = block.__class__.__name__.lower()
            if "thinking" in block_type or "thinking" in class_name:
                return value
    return None


def extract_content_text(block: object) -> str | None:
    text = getattr(block, "text", None)
    if not isinstance(text, str) or not text:
        return None

    block_type = str(getattr(block, "type", "")).lower()
    class_name = block.__class__.__name__.lower()
    if "thinking" in block_type or "thinking" in class_name:
        return None

    return text


async def stream_chat_response(app: FastAPI, payload: ChatRequest) -> AsyncIterator[bytes]:
    model, model_error = resolve_model_name(payload.model)
    force_iframe = should_force_iframe(payload.messages)

    if not os.getenv("ANTHROPIC_API_KEY"):
        yield encode_line(
            {
                "type": "error",
                "message": "ANTHROPIC_API_KEY is not set on the backend.",
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
                "message": "No model configured. Set ANTHROPIC_MODEL or ANTHROPIC_MODEL_OPTIONS.",
            }
        )
        return

    effort, effort_error = resolve_effort(model, payload.effort)
    if effort_error:
        yield encode_line(
            {
                "type": "error",
                "message": effort_error,
            }
        )
        return

    done_sent = False

    try:
        query_fn = get_query_fn(app)
        stream = query_fn(
            prompt=build_transcript_prompt(payload.messages),
            instructions=build_instructions(payload.branch_focus, force_iframe),
            model=model,
        )

        async for message in cast(Any, stream):
            for block in iter_message_blocks(message):
                reasoning_text = extract_reasoning_text(block)
                if reasoning_text:
                    yield encode_line(
                        {
                            "type": "reasoning_delta",
                            "text": reasoning_text,
                            "format": "raw",
                        }
                    )

                content_text = extract_content_text(block)
                if content_text:
                    yield encode_line({"type": "content_delta", "text": content_text})

            if getattr(message, "subtype", None) == "error":
                error_text = getattr(message, "result", None) or getattr(
                    message, "message", None
                )
                yield encode_line(
                    {
                        "type": "error",
                        "message": (
                            error_text
                            if isinstance(error_text, str) and error_text
                            else "The model stream failed."
                        ),
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
    loaded_files = load_env_files()
    if loaded_files:
        logger.info(
            "Loaded env files: %s",
            ", ".join(str(path) for path in loaded_files),
        )
    else:
        logger.warning("No .env file found for backend startup.")

    logger.info(
        "Anthropic env ready: key=%s model=%s",
        "present" if os.getenv("ANTHROPIC_API_KEY") else "missing",
        os.getenv("ANTHROPIC_MODEL") or "<unset>",
    )
    app.state.anthropic_query_fn = None
    yield


load_env_files()

app = FastAPI(title="Sidequest API", lifespan=lifespan)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat/stream")
async def chat_stream(payload: ChatRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_chat_response(app, payload),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/api/chat/models")
async def chat_models() -> dict[str, object]:
    models, default_model = get_model_config()
    return {
        "models": [build_model_option(model) for model in models],
        "default_model": default_model,
    }
