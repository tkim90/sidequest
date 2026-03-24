import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AddNewNoteButton from "./AddNewNoteButton";

describe("AddNewNoteButton", () => {
  it("renders a button with the 'Add new note' accessible label", () => {
    const markup = renderToStaticMarkup(
      <AddNewNoteButton onClick={() => {}} />,
    );

    expect(markup).toContain('aria-label="Add new note"');
  });

  it("uses the shared Button primitive (data-slot attribute)", () => {
    const markup = renderToStaticMarkup(
      <AddNewNoteButton onClick={() => {}} />,
    );

    expect(markup).toContain('data-slot="button"');
  });

  it("renders the new-note image with draggable disabled", () => {
    const markup = renderToStaticMarkup(
      <AddNewNoteButton onClick={() => {}} />,
    );

    expect(markup).toContain('src="/new-note.png"');
    expect(markup).toContain('draggable="false"');
    expect(markup).toContain('class="h-9 w-auto select-none"');
  });

  it("applies the expected positioning classes for the canvas", () => {
    const markup = renderToStaticMarkup(
      <AddNewNoteButton onClick={() => {}} />,
    );

    expect(markup).toContain("absolute");
    expect(markup).toContain("left-1/2");
    expect(markup).toContain("top-4");
    expect(markup).toContain("z-30");
  });
});
