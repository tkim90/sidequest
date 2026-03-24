import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import RetryIcon from "./RetryIcon";

describe("RetryIcon", () => {
  it("renders an svg with the default className", () => {
    const markup = renderToStaticMarkup(<RetryIcon />);

    expect(markup).toContain("<svg");
    expect(markup).toContain('class="h-3 w-3"');
    expect(markup).toContain("stroke-linecap");
  });

  it("accepts a custom className", () => {
    const markup = renderToStaticMarkup(<RetryIcon className="h-5 w-5" />);

    expect(markup).toContain('class="h-5 w-5"');
    expect(markup).not.toContain('class="h-3 w-3"');
  });
});
