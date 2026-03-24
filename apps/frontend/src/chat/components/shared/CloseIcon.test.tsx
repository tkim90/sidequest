import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CloseIcon from "./CloseIcon";

describe("CloseIcon", () => {
  it("renders an aria-hidden SVG with the close X path", () => {
    const markup = renderToStaticMarkup(<CloseIcon />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5");
    expect(markup).toContain('stroke="currentColor"');
  });

  it("uses the default size class when no className is provided", () => {
    const markup = renderToStaticMarkup(<CloseIcon />);

    expect(markup).toContain('class="h-4 w-4"');
  });

  it("accepts a custom className for sizing", () => {
    const markup = renderToStaticMarkup(<CloseIcon className="h-5 w-5" />);

    expect(markup).toContain('class="h-5 w-5"');
    expect(markup).not.toContain('class="h-4 w-4"');
  });
});
