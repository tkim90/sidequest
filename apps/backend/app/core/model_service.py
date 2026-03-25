import json
import os

from app.core.model_capabilities import ReasoningEffort, get_model_capability


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


def build_model_option(model_name: str) -> dict[str, object]:
    capability = get_model_capability(model_name)
    return {
        "id": model_name,
        "efforts": capability["efforts"],
        "default_effort": capability["default_effort"],
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

    return None, "No model configured. Set OPENAI_MODEL or OPENAI_MODEL_OPTIONS."


def resolve_effort(
    model: str,
    payload_effort: ReasoningEffort | None,
) -> tuple[ReasoningEffort | None, str | None]:
    capability = get_model_capability(model)
    efforts = capability["efforts"]
    default_effort = capability["default_effort"]

    if payload_effort is not None:
        if payload_effort not in efforts:
            return (
                None,
                (
                    f"Model {json.dumps(model)} does not support effort "
                    f"{json.dumps(payload_effort)}."
                ),
            )
        return payload_effort, None

    if default_effort is not None:
        return default_effort, None

    return None, None
