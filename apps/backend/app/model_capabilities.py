from typing import Literal, TypedDict


ReasoningEffort = Literal["none", "minimal", "low", "medium", "high", "xhigh"]


class ModelCapability(TypedDict):
    efforts: list[ReasoningEffort]
    default_effort: ReasoningEffort | None


NO_REASONING_CAPABILITY: ModelCapability = {
    "efforts": [],
    "default_effort": None,
}


# Keep this map explicit and easy to edit as OpenAI model capabilities change.
MODEL_CAPABILITIES: dict[str, ModelCapability] = {
    "gpt-4.1": NO_REASONING_CAPABILITY,
    "gpt-4.1-mini": NO_REASONING_CAPABILITY,
    "gpt-4o": NO_REASONING_CAPABILITY,
    "gpt-4o-mini": NO_REASONING_CAPABILITY,
    "gpt-5": {
        "efforts": ["minimal", "low", "medium", "high"],
        "default_effort": "medium",
    },
    "gpt-5.1": {
        "efforts": ["none", "low", "medium", "high"],
        "default_effort": "none",
    },
    "gpt-5.4": {
        "efforts": ["minimal", "low", "medium", "high", "xhigh"],
        "default_effort": "medium",
    },
    "gpt-5-pro": {
        "efforts": ["high"],
        "default_effort": "high",
    },
}


def get_model_capability(model_name: str) -> ModelCapability:
    direct = MODEL_CAPABILITIES.get(model_name)
    if direct is not None:
        return direct

    for base_model in sorted(MODEL_CAPABILITIES.keys(), key=len, reverse=True):
        if model_name.startswith(f"{base_model}-"):
            return MODEL_CAPABILITIES[base_model]

    return NO_REASONING_CAPABILITY
