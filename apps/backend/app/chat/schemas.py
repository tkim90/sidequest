from typing import Literal

from pydantic import BaseModel, Field

from app.core.model_capabilities import ReasoningEffort


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class BranchFocus(BaseModel):
    selected_text: str = Field(min_length=1)
    parent_window_title: str = Field(min_length=1)
    parent_message_role: Literal["user", "assistant"]
    latest_user_query: str = Field(min_length=1)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    branch_focus: BranchFocus | None = None
    model: str | None = Field(default=None, min_length=1)
    effort: ReasoningEffort | None = None
