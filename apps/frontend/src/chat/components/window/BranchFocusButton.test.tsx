import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import BranchFocusButton from "./BranchFocusButton";

describe("BranchFocusButton", () => {
  it("renders a button with the truncated focus label", () => {
    const markup = renderToStaticMarkup(
      <BranchFocusButton
        className="mt-2 text-muted-foreground italic"
        label="selected text"
        onClick={() => {}}
      />,
    );

    expect(markup).toContain('aria-label="selected text"');
    expect(markup).toContain("<button");
    expect(markup).toContain("overflow-hidden text-ellipsis whitespace-nowrap");
    expect(markup).toContain("selected text");
  });

  it("applies the provided className to the button element", () => {
    const markup = renderToStaticMarkup(
      <BranchFocusButton
        className="mt-2 text-[16px] leading-[1.35] text-muted-foreground italic block w-full min-w-0 cursor-pointer"
        label="focus text"
        onClick={() => {}}
      />,
    );

    expect(markup).toContain("text-[16px] leading-[1.35] text-muted-foreground italic");
    expect(markup).toContain("block w-full min-w-0 cursor-pointer");
  });

  it("does not render a tooltip portal in static markup", () => {
    const markup = renderToStaticMarkup(
      <BranchFocusButton
        className=""
        label="no tooltip in SSR"
        onClick={() => {}}
      />,
    );

    // The tooltip portal requires a mounted DOM, so SSR should only show
    // the button, not the tooltip div.
    expect(markup).not.toContain('data-focus-tooltip="true"');
  });
});
