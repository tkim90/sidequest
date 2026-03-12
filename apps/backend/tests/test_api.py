import json

from fastapi.testclient import TestClient

from app.main import app


class FakeEvent:
    def __init__(
        self,
        event_type: str,
        delta: str | None = None,
        message: str | None = None,
    ):
        self.type = event_type
        self.delta = delta
        self.message = message


class FakeStream:
    def __init__(self, events):
        self._events = iter(events)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self._events)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class FakeResponsesAPI:
    def __init__(self):
        self.calls = []
        self.events = [
            FakeEvent("response.output_text.delta", "hello "),
            FakeEvent("response.output_text.delta", "world"),
            FakeEvent("response.completed"),
        ]

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return FakeStream(self.events)


class FakeClient:
    def __init__(self):
        self.responses = FakeResponsesAPI()

    async def close(self):
        return None


def test_healthcheck():
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_stream_shapes_ndjson(monkeypatch):
    monkeypatch.setenv("OPENAI_MODEL", "gpt-5.4")
    fake_client = FakeClient()
    fake_client.responses.events = [
        FakeEvent("response.reasoning_summary_text.delta", "step 1 ", None),
        FakeEvent("response.output_text.delta", "hello ", None),
        FakeEvent("response.reasoning_text.delta", "secret ", None),
        FakeEvent("response.output_text.delta", "world", None),
        FakeEvent("response.completed"),
    ]

    with TestClient(app) as client:
        app.state.openai_client = fake_client

        response = client.post(
            "/api/chat/stream",
            json={
                "messages": [
                    {"role": "user", "content": "Hello"},
                    {"role": "assistant", "content": "Hi there"},
                    {"role": "user", "content": "Follow up"},
                ],
                "branch_focus": {
                    "selected_text": "Hello",
                    "parent_window_title": "Chat 1",
                    "parent_message_role": "user",
                },
                "effort": "medium",
            },
        )

    lines = [json.loads(line) for line in response.text.splitlines() if line.strip()]

    assert response.status_code == 200
    assert lines == [
        {"type": "reasoning_delta", "text": "step 1 ", "format": "summary"},
        {"type": "content_delta", "text": "hello "},
        {"type": "reasoning_delta", "text": "secret ", "format": "raw"},
        {"type": "content_delta", "text": "world"},
        {"type": "done"},
    ]
    assert fake_client.responses.calls[0]["input"] == [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi there"},
        {"role": "user", "content": "Follow up"},
    ]
    assert fake_client.responses.calls[0]["reasoning"] == {
        "effort": "medium",
        "summary": "auto",
    }


def test_chat_stream_uses_requested_model(monkeypatch):
    monkeypatch.setenv("OPENAI_MODEL", "gpt-4.1")
    monkeypatch.setenv("OPENAI_MODEL_OPTIONS", "gpt-4.1,gpt-5.4")
    fake_client = FakeClient()

    with TestClient(app) as client:
        app.state.openai_client = fake_client

        response = client.post(
            "/api/chat/stream",
            json={
                "messages": [
                    {"role": "user", "content": "Use another model"},
                ],
                "model": "gpt-4.1",
            },
        )

    lines = [json.loads(line) for line in response.text.splitlines() if line.strip()]

    assert response.status_code == 200
    assert lines[-1] == {"type": "done"}
    assert fake_client.responses.calls[0]["model"] == "gpt-4.1"
    assert "reasoning" not in fake_client.responses.calls[0]


def test_chat_models_endpoint_returns_options(monkeypatch):
    monkeypatch.setenv("OPENAI_MODEL", "gpt-4.1")
    monkeypatch.setenv("OPENAI_MODEL_OPTIONS", "gpt-4.1,gpt-5.4-2026-03-01")

    with TestClient(app) as client:
        response = client.get("/api/chat/models")

    assert response.status_code == 200
    assert response.json() == {
        "models": [
            {
                "id": "gpt-4.1",
                "efforts": [],
                "default_effort": None,
            },
            {
                "id": "gpt-5.4-2026-03-01",
                "efforts": ["minimal", "low", "medium", "high", "xhigh"],
                "default_effort": "medium",
            },
        ],
        "default_model": "gpt-4.1",
    }


def test_chat_stream_rejects_unsupported_effort(monkeypatch):
    monkeypatch.setenv("OPENAI_MODEL", "gpt-4.1")
    fake_client = FakeClient()

    with TestClient(app) as client:
        app.state.openai_client = fake_client

        response = client.post(
            "/api/chat/stream",
            json={
                "messages": [
                    {"role": "user", "content": "Try effort"},
                ],
                "effort": "high",
            },
        )

    lines = [json.loads(line) for line in response.text.splitlines() if line.strip()]

    assert response.status_code == 200
    assert lines == [
        {
            "type": "error",
            "message": 'Model "gpt-4.1" does not support effort "high".',
        },
    ]
    assert fake_client.responses.calls == []
