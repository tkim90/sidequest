import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import GithubLogo from "./GithubLogo";

describe("GithubLogo", () => {
  it("renders the Sidequest GitHub link with the expected external-link attributes", () => {
    const markup = renderToStaticMarkup(<GithubLogo />);

    expect(markup).toContain('aria-label="Open Sidequest on GitHub"');
    expect(markup).toContain('href="https://github.com/tkim90/sidequest"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer noopener"');
  });

  it("keeps the chip styling and icon sizing in the leaf component", () => {
    const markup = renderToStaticMarkup(
      <GithubLogo className="absolute right-10 top-8 z-30" />,
    );

    expect(markup).toContain('pointer-events-none absolute right-10 top-8 z-30');
    expect(markup).toContain('bg-transparent');
    expect(markup).toContain('translate-y-0');
    expect(markup).toContain('hover:-translate-y-0.5');
    expect(markup).not.toContain('translate-x');
    expect(markup).toContain('class="h-6 w-6"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('fill="currentColor"');
    expect(markup).toContain('viewBox="0 0 16 16"');
  });
});
