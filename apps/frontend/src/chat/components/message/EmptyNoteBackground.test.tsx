import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import EmptyNoteBackground from "./EmptyNoteBackground";

function renderBackground(isFixedPane: boolean): string {
  return renderToStaticMarkup(
    <EmptyNoteBackground
      isFixedPane={isFixedPane}
      onStarterQuestionClick={() => {}}
    />,
  );
}

describe("EmptyNoteBackground", () => {
  it("renders starter questions with wrapping and left-aligned text in the fixed pane", () => {
    const markup = renderBackground(true);

    expect(markup).toContain("Why did the Roman Empire collapse?");
    expect(markup).toContain("How did language start — did humans invent it or did it emerge?");
    expect(markup).toContain("Help me think through whether I should quit my job to start something.");
    expect(markup).toContain("w-full cursor-pointer justify-start whitespace-normal");
    expect(markup).toContain("text-left font-serif");
    expect(markup).toContain("max-w-[28ch]");
  });

  it("uses the smaller floating-pane width cap while keeping wrapping enabled", () => {
    const markup = renderBackground(false);

    expect(markup).toContain("w-full cursor-pointer justify-start whitespace-normal");
    expect(markup).toContain("text-left font-serif");
    expect(markup).toContain("max-w-[24ch]");
  });
});
