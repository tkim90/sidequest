import json

from fastapi.testclient import TestClient

from app.main import ChatMessage, app, build_instructions, should_force_iframe


class FakeBlock:
    def __init__(self, block_type: str, text: str):
        self.type = block_type
        self.text = text


class FakeAgentMessage:
    def __init__(self, content, subtype: str | None = None, result: str | None = None):
        self.content = content
        self.subtype = subtype
        self.result = result


class FakeQuery:
    def __init__(self):
        self.calls = []
        self.messages = [
            FakeAgentMessage(
                [
                    FakeBlock("thinking", "step 1 "),
                    FakeBlock("text", "hello "),
                    FakeBlock("text", "world"),
                ]
            ),
        ]

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        async def iterator():
            for message in self.messages:
                yield message
        return iterator()


def test_healthcheck():
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_stream_shapes_ndjson(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    fake_query = FakeQuery()

    with TestClient(app) as client:
        app.state.anthropic_query_fn = fake_query

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
        {"type": "reasoning_delta", "text": "step 1 ", "format": "raw"},
        {"type": "content_delta", "text": "hello "},
        {"type": "content_delta", "text": "world"},
        {"type": "done"},
    ]
    assert (
        fake_query.calls[0]["prompt"]
        == "Continue this conversation as the assistant. "
        "Answer the final user message naturally and stay grounded in the transcript."
        "\n\n<conversation>\n"
        "USER: Hello\n"
        "ASSISTANT: Hi there\n"
        "USER: Follow up\n"
        "</conversation>"
    )
    assert "Iframe Visualization" in fake_query.calls[0]["instructions"]
    assert fake_query.calls[0]["model"] == "claude-sonnet-4-5"


def test_chat_stream_uses_requested_model(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    monkeypatch.setenv("ANTHROPIC_MODEL_OPTIONS", "claude-sonnet-4-5,claude-opus-4-1")
    fake_query = FakeQuery()

    with TestClient(app) as client:
        app.state.anthropic_query_fn = fake_query

        response = client.post(
            "/api/chat/stream",
            json={
                "messages": [
                    {"role": "user", "content": "Use another model"},
                ],
                "model": "claude-opus-4-1",
            },
        )

    lines = [json.loads(line) for line in response.text.splitlines() if line.strip()]

    assert response.status_code == 200
    assert lines[-1] == {"type": "done"}
    assert fake_query.calls[0]["model"] == "claude-opus-4-1"


def test_chat_models_endpoint_returns_options(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    monkeypatch.setenv(
        "ANTHROPIC_MODEL_OPTIONS",
        "claude-sonnet-4-5,claude-opus-4-1",
    )

    with TestClient(app) as client:
        response = client.get("/api/chat/models")

    assert response.status_code == 200
    assert response.json() == {
        "models": [
            {
                "id": "claude-sonnet-4-5",
                "efforts": [],
                "default_effort": None,
            },
            {
                "id": "claude-opus-4-1",
                "efforts": [],
                "default_effort": None,
            },
        ],
        "default_model": "claude-sonnet-4-5",
    }


def test_chat_stream_rejects_unsupported_effort(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    fake_query = FakeQuery()

    with TestClient(app) as client:
        app.state.anthropic_query_fn = fake_query

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
            "message": 'Model "claude-sonnet-4-5" does not support effort "high".',
        },
    ]
    assert fake_query.calls == []


def test_build_instructions_includes_iframe_guidance():
    instructions = build_instructions(None)

    assert "Iframe Visualization" in instructions
    assert "```iframe" in instructions


def test_visualization_requests_force_iframe_instructions():
    instructions = build_instructions(None, True)

    assert "must respond with normal prose plus at least one ```iframe code fence" in instructions
    assert "Do not emit any ```jsonrender fence" in instructions


def test_should_force_iframe_detects_visualization_requests():
    assert should_force_iframe(
        [
            ChatMessage(role="assistant", content="prior")
        ]
    ) is False
    assert should_force_iframe(
        [
            ChatMessage(role="user", content="visualize a binary search tree")
        ]
    ) is True
