import { describe, expect, it } from "vitest";

import { partialJsonParse, tryParseSpec } from "./partialJsonParse";

describe("tryParseSpec", () => {
  it("rejects specs with missing child references", () => {
    const input = JSON.stringify({
      root: "root",
      elements: {
        root: {
          type: "Stack",
          children: ["missing"],
        },
      },
    });

    expect(tryParseSpec(input)).toBeNull();
  });

  it("accepts specs with valid child references", () => {
    const input = JSON.stringify({
      root: "root",
      elements: {
        root: {
          type: "Stack",
          children: ["child"],
        },
        child: {
          type: "Text",
          props: { content: "hello" },
        },
      },
    });

    expect(tryParseSpec(input)).toEqual({
      root: "root",
      elements: {
        root: {
          type: "Stack",
          children: ["child"],
        },
        child: {
          type: "Text",
          props: { content: "hello" },
        },
      },
    });
  });
});

describe("partialJsonParse", () => {
  it("allows unresolved child references while streaming", () => {
    const input = JSON.stringify({
      root: "root",
      elements: {
        root: {
          type: "Stack",
          children: ["missing"],
        },
      },
    });

    expect(partialJsonParse(input)).toEqual({
      root: "root",
      elements: {
        root: {
          type: "Stack",
          children: ["missing"],
        },
      },
    });
  });
});
