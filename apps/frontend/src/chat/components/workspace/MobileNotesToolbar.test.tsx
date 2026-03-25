import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MobileNotesToolbar from "./MobileNotesToolbar";

function renderToolbar(options: {
  hasNotes: boolean;
  isNotesOpen: boolean;
}): string {
  return renderToStaticMarkup(
    <MobileNotesToolbar
      hasNotes={options.hasNotes}
      isNotesOpen={options.isNotesOpen}
      onAddNote={() => {}}
      onCloseNotes={() => {}}
      onOpenNotes={() => {}}
    />,
  );
}

describe("MobileNotesToolbar", () => {
  it("always renders the add-note button", () => {
    const markup = renderToolbar({
      hasNotes: false,
      isNotesOpen: false,
    });

    expect(markup).toContain('data-mobile-notes-toolbar="true"');
    expect(markup).toContain('aria-label="Add new note"');
    expect(markup).toContain(">+</span>");
  });

  it("renders the stacked-notes icon when notes are available and the overlay is closed", () => {
    const markup = renderToolbar({
      hasNotes: true,
      isNotesOpen: false,
    });

    expect(markup).toContain('aria-label="View notes"');
    expect(markup).toContain('data-stacked-notes-icon="true"');
    expect(markup.match(/<rect/g)?.length).toBe(2);
    expect(markup).not.toContain('fill="none"');
    expect(markup.match(/fill="#F8F4EE"/g)?.length).toBe(2);
    expect(markup.match(/stroke="currentColor"/g)?.length).toBe(2);
  });

  it("reuses the close glyph when the overlay is open", () => {
    const markup = renderToolbar({
      hasNotes: true,
      isNotesOpen: true,
    });

    expect(markup).toContain('aria-label="Close notes"');
    expect(markup).toContain("<svg");
    expect(markup).not.toContain('data-stacked-notes-icon="true"');
  });
});
