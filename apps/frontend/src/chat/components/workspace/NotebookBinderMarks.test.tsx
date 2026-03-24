import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import NotebookBinderMarks, { BINDER_MARKS } from "./NotebookBinderMarks";

describe("NotebookBinderMarks", () => {
  it("renders the correct number of binder marks matching the exported constant", () => {
    const markup = renderToStaticMarkup(
      <NotebookBinderMarks gutterWidthPx={68} />,
    );

    const circleCount = (markup.match(/h-4 w-4 rounded-full/g) ?? []).length;
    const capsuleCount = (markup.match(/h-8 w-4 rounded-full/g) ?? []).length;
    const expectedCircles = BINDER_MARKS.filter((m) => m === "circle").length;
    const expectedCapsules = BINDER_MARKS.filter((m) => m === "capsule").length;

    expect(circleCount).toBe(expectedCircles);
    expect(capsuleCount).toBe(expectedCapsules);
    expect(circleCount + capsuleCount).toBe(BINDER_MARKS.length);
  });

  it("applies the gutter width from props and is aria-hidden", () => {
    const markup = renderToStaticMarkup(
      <NotebookBinderMarks gutterWidthPx={80} />,
    );

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('width:80px');
  });

  it("is purely presentational with no interactive elements", () => {
    const markup = renderToStaticMarkup(
      <NotebookBinderMarks gutterWidthPx={68} />,
    );

    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("<a ");
    expect(markup).toContain("pointer-events-none");
  });
});
