import type { MessageRenderPolicy } from "../../types";

const VISUALIZATION_PATTERNS = [
  /\bvisuali[sz]e\b/i,
  /\bvisualization\b/i,
  /\binteractive\b/i,
  /\bdiagram\b/i,
  /\bsimulation\b/i,
  /\bexplainer\b/i,
  /\bbuild an? (interactive )?(ui|demo|visual)/i,
  /\brender\b/i,
  /\banimate\b/i,
  /\bshow me\b.*\b(tree|graph|chart|diagram)\b/i,
] as const;

export function shouldForceIframeForPrompt(prompt: string): boolean {
  const normalized = prompt.trim();
  if (!normalized) {
    return false;
  }

  return VISUALIZATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function resolveRenderPolicyForPrompt(prompt: string): MessageRenderPolicy {
  return shouldForceIframeForPrompt(prompt) ? "force_iframe" : "default";
}
