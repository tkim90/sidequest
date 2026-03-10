import { describe, expect, it } from "vitest";

import { computeBlockOffsets } from "./offsetMap";
import type { MarkdownBlock } from "./types";

describe("computeBlockOffsets", () => {
  it("counts rendered markdown text for tables with inline formatting", () => {
    const blocks: MarkdownBlock[] = [
      {
        id: 1,
        type: "paragraph",
        text: "Hi",
      },
      {
        id: 2,
        type: "table",
        headers: ["**A**", "B"],
        alignments: ["left", "right"],
        rows: [["C", "`D`"]],
      },
    ];

    expect(computeBlockOffsets(blocks)).toEqual([
      {
        blockIndex: 0,
        renderedStart: 0,
        renderedEnd: 2,
      },
      {
        blockIndex: 1,
        renderedStart: 3,
        renderedEnd: 10,
      },
    ]);
  });
});
