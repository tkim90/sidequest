import { describe, expect, it } from "vitest";

import { blocksEqual, createParserState, parseAllBlocks, parseChunk } from "./parser";
import type { TableBlock } from "./types";

describe("parseChunk", () => {
  it("parses markdown tables with alignments and rows", () => {
    const parser = createParserState();
    const result = parseChunk(
      parser,
      [],
      [
        "| Name | Score |",
        "| :--- | ---: |",
        "| Ada | 99 |",
        "| Lin | 88 |",
      ].join("\n"),
      true,
    );

    expect(result.nextBlocks).toEqual([
      {
        id: 1,
        type: "table",
        headers: ["Name", "Score"],
        alignments: ["left", "right"],
        rows: [
          ["Ada", "99"],
          ["Lin", "88"],
        ],
      },
    ]);
    expect(result.activeBlock).toBeNull();
  });

  it("treats equivalent table blocks as equal", () => {
    const left: TableBlock = {
      id: 1,
      type: "table",
      headers: ["Name", "Score"],
      alignments: ["left", "right"],
      rows: [["Ada", "99"]],
    };
    const right: TableBlock = {
      id: 1,
      type: "table",
      headers: ["Name", "Score"],
      alignments: ["left", "right"],
      rows: [["Ada", "99"]],
    };

    expect(blocksEqual(left, right)).toBe(true);
  });

  it("parses prose around iframe code fences", () => {
    expect(
      parseAllBlocks(
        [
          "Here is an interactive explanation:",
          "",
          "```iframe",
          "<div>demo</div>",
          "<script>console.log('ok')</script>",
          "```",
          "",
          "The visualization is embedded above.",
        ].join("\n"),
      ),
    ).toEqual([
      {
        id: 1,
        type: "paragraph",
        text: "Here is an interactive explanation:",
      },
      {
        id: 2,
        type: "code",
        language: "iframe",
        code: "<div>demo</div>\n<script>console.log('ok')</script>",
      },
      {
        id: 3,
        type: "paragraph",
        text: "The visualization is embedded above.",
      },
    ]);
  });
});
