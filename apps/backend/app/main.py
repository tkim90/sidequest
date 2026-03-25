from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.chat.router import router as chat_router
from app.health.router import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.openai_client = None
    yield
    client = getattr(app.state, "openai_client", None)
    if client is not None:
        await client.close()


app = FastAPI(title="Sidequest API", lifespan=lifespan)
app.include_router(health_router)
app.include_router(chat_router)

__all__ = ["app"]
