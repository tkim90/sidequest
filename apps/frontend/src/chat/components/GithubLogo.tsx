import GithubMarkIcon from "./GithubMarkIcon";

const SIDEQUEST_GITHUB_URL = "https://github.com/tkim90/sidequest";

interface GithubLogoProps {
  className?: string;
}

function GithubLogo({ className }: GithubLogoProps) {
  return (
    <div className={["pointer-events-none", className].filter(Boolean).join(" ")}>
      <a
        aria-label="Open Sidequest on GitHub"
        className="pointer-events-auto inline-flex h-11 w-11 translate-y-0 items-center justify-center rounded-full border border-[rgb(86_75_61_/_0.12)] bg-transparent text-foreground shadow-[0_10px_24px_rgb(86_75_61_/_0.12)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgb(86_75_61_/_0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        href={SIDEQUEST_GITHUB_URL}
        rel="noreferrer noopener"
        target="_blank"
      >
        <GithubMarkIcon className="h-6 w-6" />
      </a>
    </div>
  );
}

export default GithubLogo;
