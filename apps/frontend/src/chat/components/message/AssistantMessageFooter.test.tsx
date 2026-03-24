import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AssistantMessageFooter from "./AssistantMessageFooter";

describe("AssistantMessageFooter", () => {
  it("renders the Retry button and model badge for a complete message with a model", () => {
    const markup = renderToStaticMarkup(
      <AssistantMessageFooter
        isComplete
        model="gpt-4o"
        onRetry={() => {}}
      />,
    );

    expect(markup).toContain('title="Retry"');
    expect(markup).toContain("<svg");
    expect(markup).toContain(">gpt-4o</span>");
    expect(markup).toContain("group-hover:opacity-100");
    expect(markup).toContain("group-focus-within:opacity-100");
  });

  it("hides the Retry button when the message is not complete", () => {
    const markup = renderToStaticMarkup(
      <AssistantMessageFooter
        isComplete={false}
        model="gpt-4o"
        onRetry={() => {}}
      />,
    );

    expect(markup).not.toContain('title="Retry"');
    expect(markup).toContain(">gpt-4o</span>");
  });

  it("hides the model badge when model is undefined", () => {
    const markup = renderToStaticMarkup(
      <AssistantMessageFooter
        isComplete
        model={undefined}
        onRetry={() => {}}
      />,
    );

    expect(markup).toContain('title="Retry"');
    expect(markup).not.toContain("gpt-4o");
  });

  it("renders an empty footer when incomplete and no model", () => {
    const markup = renderToStaticMarkup(
      <AssistantMessageFooter
        isComplete={false}
        model={undefined}
        onRetry={() => {}}
      />,
    );

    expect(markup).not.toContain('title="Retry"');
    expect(markup).not.toContain("<svg");
    expect(markup).toContain("opacity-0");
  });
});
