import json

from fastapi.testclient import TestClient

from app.main import app


class FakeEvent:
    def __init__(self, event_type: str, delta: str | None = None):
        self.type = event_type
        self.delta = delta


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

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return FakeStream(
            [
                FakeEvent("response.output_text.delta", "hello "),
                FakeEvent("response.output_text.delta", "world"),
                FakeEvent("response.completed"),
            ]
        )


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
    monkeypatch.setenv("OPENAI_MODEL", "test-model")
    fake_client = FakeClient()

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
            },
        )

    lines = [json.loads(line) for line in response.text.splitlines() if line.strip()]

    assert response.status_code == 200
    assert lines == [
        {"type": "delta", "text": "hello "},
        {"type": "delta", "text": "world"},
        {"type": "done"},
    ]
    assert fake_client.responses.calls[0]["input"] == [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi there"},
        {"role": "user", "content": "Follow up"},
    ]
