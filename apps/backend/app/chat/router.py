from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.chat.schemas import ChatRequest
from app.chat.service import stream_chat_response
from app.core.model_service import build_model_option, get_model_config

router = APIRouter()


@router.post("/api/chat/stream")
async def chat_stream(request: Request, payload: ChatRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_chat_response(request.app, payload),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/api/chat/models")
async def chat_models() -> dict[str, object]:
    models, default_model = get_model_config()
    return {
        "models": [build_model_option(model) for model in models],
        "default_model": default_model,
    }
