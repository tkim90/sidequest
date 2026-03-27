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

    expect(markup).toContain("Why do humans find patterns in randomness?");
    expect(markup).toContain("What actually makes a piece of writing 'good'?");
    expect(markup).toContain("Give me a random Jean Sartre quote.");
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
