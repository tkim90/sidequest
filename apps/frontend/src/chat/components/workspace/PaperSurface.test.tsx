import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PaperSurface from "./PaperSurface";

describe("PaperSurface", () => {
  it("renders the paper wrapper and content layer", () => {
    const markup = renderToStaticMarkup(
      <PaperSurface className="h-full" contentClassName="px-4">
        <p>Example</p>
      </PaperSurface>,
    );

    expect(markup).toContain('data-paper-surface="true"');
    expect(markup).toContain('class="paper-surface relative overflow-hidden h-full"');
    expect(markup).toContain('data-paper-surface-content="true"');
    expect(markup).toContain('class="paper-surface__content relative z-[1] min-w-0 px-4"');
  });

  it("maps the selected intensity to the texture opacity variable", () => {
    const markup = renderToStaticMarkup(
      <PaperSurface intensity="strong">
        <p>Example</p>
      </PaperSurface>,
    );

    expect(markup).toContain('style="--paper-texture-opacity:0.22"');
  });
});
