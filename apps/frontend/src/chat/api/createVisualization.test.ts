import { afterEach, describe, expect, it, vi } from "vitest";

import { createVisualization } from "./createVisualization";

describe("createVisualization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed visualization payload on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          title: "Geometry map",
          shapes: [],
          assets: [],
          bindings: [],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createVisualization({
        prompt: "Focus on the geometry relationships",
        selectedText: "Geometry",
        sourceMessage: "Explain geometry.",
        sourceTitle: "Sidequest",
      }),
    ).resolves.toEqual({
      title: "Geometry map",
      shapes: [],
      assets: [],
      bindings: [],
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<
      string,
      unknown
    >;

    expect(request).toEqual({
      prompt: "Focus on the geometry relationships",
      selected_text: "Geometry",
      source_message: "Explain geometry.",
      source_title: "Sidequest",
      model: undefined,
      effort: null,
    });
  });

  it("surfaces plain-text backend failures without trying to parse them as JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      }),
    );

    await expect(
      createVisualization({
        selectedText: "Geometry",
        sourceMessage: "Explain geometry.",
        sourceTitle: "Sidequest",
      }),
    ).rejects.toThrow("Internal Server Error");
  });
});
