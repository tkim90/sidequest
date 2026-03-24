import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import SplitPaneDivider from "./SplitPaneDivider";

describe("SplitPaneDivider", () => {
  it("renders a hidden-on-mobile col-resize divider", () => {
    const markup = renderToStaticMarkup(
      <SplitPaneDivider isResizing={false} onPointerDown={() => {}} />,
    );

    expect(markup).toContain("cursor-col-resize");
    expect(markup).toContain("lg:block");
    expect(markup).toContain("hidden");
    expect(markup).toContain('aria-hidden="true"');
  });

  it("applies active styling when resizing", () => {
    const markup = renderToStaticMarkup(
      <SplitPaneDivider isResizing={true} onPointerDown={() => {}} />,
    );

    expect(markup).toContain("bg-foreground/35");
    expect(markup).toContain("bg-paper-raised/80");
  });

  it("applies idle styling when not resizing", () => {
    const markup = renderToStaticMarkup(
      <SplitPaneDivider isResizing={false} onPointerDown={() => {}} />,
    );

    expect(markup).toContain("bg-border/90");
    expect(markup).not.toContain("bg-foreground/35");
  });
});
