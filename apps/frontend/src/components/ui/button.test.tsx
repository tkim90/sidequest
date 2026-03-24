import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("renders with default variant and size classes", () => {
    const markup = renderToStaticMarkup(<Button>Click me</Button>);

    expect(markup).toContain("Click me");
    expect(markup).toContain('data-slot="button"');
    expect(markup).toContain("bg-primary");
    expect(markup).toContain("border-primary");
    expect(markup).toContain("text-primary-foreground");
  });

  it("renders secondary variant preserving notebook styling", () => {
    const markup = renderToStaticMarkup(
      <Button variant="secondary">Cancel</Button>,
    );

    expect(markup).toContain("Cancel");
    expect(markup).toContain("bg-paper-sheet");
    expect(markup).toContain("border-border");
    expect(markup).toContain("text-foreground");
  });

  it("renders ghost variant for picker-style controls", () => {
    const markup = renderToStaticMarkup(
      <Button variant="ghost">Pick</Button>,
    );

    expect(markup).toContain("Pick");
    expect(markup).toContain("text-muted-foreground");
    expect(markup).toContain("rounded-lg");
  });

  it("renders destructive variant", () => {
    const markup = renderToStaticMarkup(
      <Button variant="destructive">Delete</Button>,
    );

    expect(markup).toContain("Delete");
    expect(markup).toContain("bg-destructive");
  });

  it("merges custom className with variant classes", () => {
    const markup = renderToStaticMarkup(
      <Button className="mt-4">Styled</Button>,
    );

    expect(markup).toContain("mt-4");
    expect(markup).toContain("bg-primary");
  });

  it("passes through HTML button attributes", () => {
    const markup = renderToStaticMarkup(
      <Button type="submit" disabled aria-label="Send message">
        Send
      </Button>,
    );

    expect(markup).toContain('type="submit"');
    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-label="Send message"');
  });

  it("applies icon size", () => {
    const markup = renderToStaticMarkup(
      <Button size="icon" aria-label="Icon button">
        ✕
      </Button>,
    );

    expect(markup).toContain("size-9");
  });
});

describe("buttonVariants", () => {
  it("returns default variant classes when called with no arguments", () => {
    const classes = buttonVariants();

    expect(classes).toContain("bg-primary");
    expect(classes).toContain("cursor-pointer");
  });

  it("returns secondary variant classes", () => {
    const classes = buttonVariants({ variant: "secondary" });

    expect(classes).toContain("bg-paper-sheet");
    expect(classes).toContain("border-border");
  });

  it("returns ghost variant classes", () => {
    const classes = buttonVariants({ variant: "ghost" });

    expect(classes).toContain("text-muted-foreground");
  });
});
