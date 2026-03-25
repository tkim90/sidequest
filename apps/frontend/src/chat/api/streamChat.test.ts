import { afterEach, describe, expect, it, vi } from "vitest";

import { streamChat } from "./streamChat";

function createDoneResponse(): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"type":"done"}\n'));
      controller.close();
    },
  });

  return new Response(stream, { status: 200 });
}

describe("streamChat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes latest_user_query for branched requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(createDoneResponse());

    await streamChat({
      messages: [{ role: "user", content: "Who is this?" }],
      branchFocus: {
        selectedText: "Claude Shannon",
        parentWindowTitle: "Chat 1",
        parentMessageRole: "assistant",
        latestUserQuery: "Who is this?",
      },
      onContentDelta: () => {},
      onReasoningDelta: () => {},
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<
      string,
      unknown
    >;

    expect(request.branch_focus).toEqual({
      selected_text: "Claude Shannon",
      parent_window_title: "Chat 1",
      parent_message_role: "assistant",
      latest_user_query: "Who is this?",
    });
  });

  it("omits branch_focus for ordinary root-window sends", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(createDoneResponse());

    await streamChat({
      messages: [{ role: "user", content: "Hello" }],
      branchFocus: null,
      onContentDelta: () => {},
      onReasoningDelta: () => {},
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<
      string,
      unknown
    >;

    expect(request).not.toHaveProperty("branch_focus");
  });
});
