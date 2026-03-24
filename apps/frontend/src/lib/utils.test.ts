import { describe, it, expect } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("resolves tailwind conflicts by keeping the last value", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("base", undefined, null, "extra")).toBe("base extra");
  });

  it("returns an empty string for no inputs", () => {
    expect(cn()).toBe("");
  });
});
