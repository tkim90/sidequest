interface AnchorHighlightOptions {
  activeSource?: boolean;
  isFocused: boolean;
  isPreview?: boolean;
  tone: "plain" | "dark" | "monochrome";
}

const BOX_DECORATION_CLASS =
  "[box-decoration-break:clone] [-webkit-box-decoration-break:clone]";

export function getAnchorHighlightClass({
  activeSource = false,
  isFocused,
  isPreview = false,
  tone,
}: AnchorHighlightOptions): string {
  if (isPreview) {
    return `border border-dashed border-warning/60 bg-warning/15 ${BOX_DECORATION_CLASS}`;
  }

  if (tone === "plain" || tone === "monochrome") {
    if (activeSource) {
      return isFocused
        ? `border border-warning/90 bg-warning/40 ${BOX_DECORATION_CLASS}`
        : `border border-warning/40 bg-yellow/50 ${BOX_DECORATION_CLASS}`;
    }

    return isFocused
      ? `border border-warning/60 bg-warning/20 ${BOX_DECORATION_CLASS}`
      : `border border-warning/35 bg-warning/10 ${BOX_DECORATION_CLASS}`;
  }

  if (activeSource) {
    return isFocused
      ? `border border-warning/70 bg-warning/35 px-0.2 text-warning-foreground [box-decoration-break:clone] [-webkit-box-decoration-break:clone]`
      : `border border-warning/45 bg-warning/20 px-0.2 text-warning-foreground/80 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]`;
  }

  return isFocused
    ? `border border-warning/60 bg-warning/25 px-0.2 text-warning-foreground [box-decoration-break:clone] [-webkit-box-decoration-break:clone]`
    : `border border-warning/35 bg-warning/10 px-0.2 text-warning-foreground/70 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]`;
}

export function getAnchorBadgeClass({
  activeSource = false,
  isFocused,
  tone,
}: Omit<AnchorHighlightOptions, "isPreview">): string {
  if (tone === "plain" || tone === "monochrome") {
    if (activeSource) {
      return isFocused
        ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/70 bg-warning/30 px-1 align-middle text-[11px] font-semibold text-foreground"
        : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/45 bg-warning/18 px-1 align-middle text-[11px] font-semibold text-foreground/70";
    }

    return isFocused
      ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/70 bg-warning/20 px-1 align-middle text-[11px] font-semibold text-foreground"
      : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/35 bg-warning/10 px-1 align-middle text-[11px] font-semibold text-foreground/70";
  }

  if (activeSource) {
    return isFocused
      ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/70 bg-warning/35 px-1 align-middle text-[11px] font-semibold text-warning-foreground"
      : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/45 bg-warning/20 px-1 align-middle text-[11px] font-semibold text-warning-foreground/70";
  }

  return isFocused
    ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/60 bg-warning/25 px-1 align-middle text-[11px] font-semibold text-warning-foreground"
    : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/35 bg-warning/10 px-1 align-middle text-[11px] font-semibold text-warning-foreground/70";
}
