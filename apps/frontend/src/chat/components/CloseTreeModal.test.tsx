import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CloseTreeModal from "./CloseTreeModal";

const CLOSE_PROMPT = {
  confirmLabel: "Close all",
  eyebrow: "Close branch tree",
  title: "Closing this window will also close its connected windows.",
  windowIds: ["win-1", "win-2"],
  windowTitles: ["Chat 1.1", "Chat 1.2"],
};

describe("CloseTreeModal", () => {
  it("renders the eyebrow, title, and descendant window titles", () => {
    const markup = renderToStaticMarkup(
      <CloseTreeModal
        closePrompt={CLOSE_PROMPT}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(markup).toContain("Close branch tree");
    expect(markup).toContain(
      "Closing this window will also close its connected windows.",
    );
    expect(markup).toContain("Chat 1.1");
    expect(markup).toContain("Chat 1.2");
  });

  it("renders Cancel and confirm buttons using the shared Button primitive", () => {
    const markup = renderToStaticMarkup(
      <CloseTreeModal
        closePrompt={CLOSE_PROMPT}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(markup).toContain(">Cancel<");
    expect(markup).toContain(">Close all<");
    // The shared Button primitive renders data-slot="button"
    expect(markup).toContain('data-slot="button"');
  });

  it("omits the list when windowTitles is empty", () => {
    const markup = renderToStaticMarkup(
      <CloseTreeModal
        closePrompt={{ ...CLOSE_PROMPT, windowTitles: [] }}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(markup).not.toContain("<ul");
    expect(markup).not.toContain("<li");
  });
});
