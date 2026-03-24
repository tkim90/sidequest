import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SidequestHandwriting from "./SidequestHandwriting";

describe("SidequestHandwriting", () => {
  it("renders an accessible svg wordmark", () => {
    const markup = renderToStaticMarkup(<SidequestHandwriting />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Sidequest"');
    expect(markup).toContain('data-sidequest-handwriting=');
    expect(markup).toContain('stroke="currentColor"');
    expect(markup).toContain('stroke-linecap="round"');
    expect(markup).toContain('stroke-linejoin="round"');
  });

  it("renders authored paths with stroke-dash animation attributes", () => {
    const markup = renderToStaticMarkup(<SidequestHandwriting />);

    expect(markup.match(/data-sidequest-handwriting-stroke=/g)?.length).toBe(10);
    expect(markup.match(/pathLength="1"/g)?.length).toBe(10);
    expect(markup.match(/stroke-dasharray="1 1"/g)?.length).toBe(10);
    expect(markup.match(/stroke-dashoffset="1"/g)?.length).toBe(10);
    expect(markup).toContain('viewBox="0 0 69.591225 31.506756"');
    expect(markup).toContain('transform="translate(-2.241694,-2.5051657)"');
  });

  it("applies custom class, size, color, and duration values", () => {
    const markup = renderToStaticMarkup(
      <SidequestHandwriting
        className="text-stone-600"
        color="#57534e"
        duration={2.4}
        height={96}
        width={360}
      />,
    );

    expect(markup).toContain('class="text-stone-600"');
    expect(markup).toContain('style="color:#57534e;display:block;height:96px;width:360px"');
    expect(markup).toContain('stroke-dasharray="1 1"');
    expect(markup).toContain('stroke-width="0.7"');
  });

  it("emits reduced-motion css that renders the wordmark fully drawn", () => {
    const markup = renderToStaticMarkup(<SidequestHandwriting />);

    expect(markup).toContain("@media (prefers-reduced-motion: reduce)");
    expect(markup).toContain("opacity: 1 !important");
    expect(markup).toContain("stroke-dashoffset: 0 !important");
  });
});
