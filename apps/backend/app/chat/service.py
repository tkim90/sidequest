import json
from collections.abc import AsyncIterator
from typing import Any, cast

from fastapi import FastAPI

from app.chat.schemas import BranchFocus, ChatMessage, ChatRequest
from app.core.model_service import resolve_effort, resolve_model_name
from app.core.openai_client import get_client
from app.core.prompt_loader import render_prompt_template


CHAT_PROMPTS_PACKAGE = "app.chat.prompts"


def encode_line(payload: dict[str, object]) -> bytes:
    return f"{json.dumps(payload)}\n".encode("utf-8")


def build_instructions(branch_focus: BranchFocus | None) -> str:
    instructions = render_prompt_template(
        "base_instructions.py",
        package=CHAT_PROMPTS_PACKAGE,
        catalog_prompt=render_prompt_template(
            "catalog_prompt.py",
            package=CHAT_PROMPTS_PACKAGE,
        ),
    )

    if branch_focus is None:
        return instructions

    return render_prompt_template(
        "branch_instructions.py",
        package=CHAT_PROMPTS_PACKAGE,
        instructions=instructions,
        parent_message_role=branch_focus.parent_message_role,
        parent_window_title=branch_focus.parent_window_title,
        selected_text=json.dumps(branch_focus.selected_text),
        latest_user_query=json.dumps(branch_focus.latest_user_query),
    )


def build_input(messages: list[ChatMessage]) -> list[dict[str, str]]:
    return [
        {
            "role": message.role,
            "content": message.content,
        }
        for message in messages
    ]


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
        request_kwargs: dict[str, object] = {
            "model": model,
            "input": cast(Any, build_input(payload.messages)),
            "instructions": build_instructions(payload.branch_focus),
            "stream": True,
        }

        if effort is not None:
            reasoning_config: dict[str, str] = {"effort": effort}
            if effort != "none":
                reasoning_config["summary"] = "auto"
            request_kwargs["reasoning"] = reasoning_config

        stream = await client.responses.create(**request_kwargs)

        async for event in stream:
            if event.type == "response.output_text.delta" and event.delta:
                yield encode_line({"type": "content_delta", "text": event.delta})
            elif event.type == "response.reasoning_text.delta" and event.delta:
                yield encode_line(
                    {
                        "type": "reasoning_delta",
                        "text": event.delta,
                        "format": "raw",
                    }
                )
            elif event.type == "response.reasoning_summary_text.delta" and event.delta:
                yield encode_line(
                    {
                        "type": "reasoning_delta",
                        "text": event.delta,
                        "format": "summary",
                    }
                )
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
