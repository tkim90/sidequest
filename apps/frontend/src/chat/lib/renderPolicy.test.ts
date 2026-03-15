import { describe, expect, it } from "vitest";

import {
  resolveRenderPolicyForPrompt,
  shouldForceIframeForPrompt,
} from "./renderPolicy";

describe("renderPolicy", () => {
  it("forces iframe for visualization prompts", () => {
    expect(shouldForceIframeForPrompt("visualize a basic binary search tree")).toBe(true);
    expect(resolveRenderPolicyForPrompt("build an interactive diagram of a graph")).toBe(
      "force_iframe",
    );
  });

  it("leaves non-visual prompts on the default policy", () => {
    expect(shouldForceIframeForPrompt("summarize this API response")).toBe(false);
    expect(resolveRenderPolicyForPrompt("make a small table of results")).toBe("default");
  });
});
