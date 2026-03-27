import { afterEach, describe, expect, it, vi } from "vitest";

import { streamVisualization } from "./streamVisualization";

function createStreamResponse(lines: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`${lines.join("\n")}\n`));
      controller.close();
    },
  });

  return new Response(stream, { status: 200 });
}

describe("streamVisualization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes the visualization request body", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(createStreamResponse(['{"type":"done"}']));

    await streamVisualization({
      prompt: "Focus on the shortest path flow",
      selectedText: "Dijkstra",
      sourceMessage: "Explain Dijkstra's algorithm.",
      sourceTitle: "Sidequest",
      model: "gpt-5.4",
      effort: null,
      onStatus: () => {},
      onFinal: () => {},
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<
      string,
      unknown
    >;

    expect(request).toEqual({
      prompt: "Focus on the shortest path flow",
      selected_text: "Dijkstra",
      source_message: "Explain Dijkstra's algorithm.",
      source_title: "Sidequest",
      model: "gpt-5.4",
      effort: null,
    });
  });

  it("parses status and final events in order", async () => {
    const events: string[] = [];

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamResponse([
        '{"type":"status","phase":"planning","message":"Planning diagram"}',
        '{"type":"final","title":"Final","shapes":[{"_type":"rectangle","shapeId":"box:1"}],"assets":[],"bindings":[]}',
        '{"type":"done"}',
      ]),
    );

    await streamVisualization({
      selectedText: "Dijkstra",
      sourceMessage: "Explain Dijkstra's algorithm.",
      sourceTitle: "Sidequest",
      onStatus: ({ phase }) => {
        events.push(`status:${phase}`);
      },
      onFinal: ({ title, shapes }) => {
        events.push(`final:${title}:${shapes.length}`);
      },
    });

    expect(events).toEqual([
      "status:planning",
      "final:Final:1",
    ]);
  });
});
