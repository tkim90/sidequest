import os

from fastapi import FastAPI
from openai import AsyncOpenAI


def get_client(app: FastAPI) -> AsyncOpenAI | None:
    if getattr(app.state, "openai_client", None) is not None:
        return app.state.openai_client

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    client = AsyncOpenAI(api_key=api_key)
    app.state.openai_client = client
    return client
