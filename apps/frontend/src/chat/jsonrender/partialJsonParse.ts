import type { JsonRenderSpec } from "./types";

/**
 * Attempts to parse a potentially incomplete JSON string by closing
 * unclosed braces, brackets, and strings. Returns the parsed spec
 * or null if not yet parseable.
 */
export function partialJsonParse(input: string): JsonRenderSpec | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  // Try parsing as-is first
  try {
    const result = JSON.parse(trimmed);
    if (isValidSpec(result, { requireChildReferences: false })) return result;
    return null;
  } catch {
    // Continue to repair attempt
  }

  // Attempt to close unclosed structures
  const repaired = closeJson(trimmed);
  if (repaired === null) return null;

  try {
    const result = JSON.parse(repaired);
    if (isValidSpec(result, { requireChildReferences: false })) return result;
    return null;
  } catch {
    return null;
  }
}

export function tryParseSpec(input: string): JsonRenderSpec | null {
  try {
    const result = JSON.parse(input.trim());
    if (isValidSpec(result, { requireChildReferences: true })) return result;
    return null;
  } catch {
    return null;
  }
}

interface SpecValidationOptions {
  requireChildReferences: boolean;
}

function isValidSpec(
  obj: unknown,
  { requireChildReferences }: SpecValidationOptions,
): obj is JsonRenderSpec {
  if (typeof obj !== "object" || obj === null) return false;
  const spec = obj as Record<string, unknown>;
  if (typeof spec.root !== "string" || spec.root.length === 0) {
    return false;
  }

  if (typeof spec.elements !== "object" || spec.elements === null) {
    return false;
  }

  const elements = spec.elements as Record<string, unknown>;
  const rootElement = elements[spec.root];

  if (!isValidElement(rootElement)) {
    return false;
  }

  if (!Object.values(elements).every(isValidElement)) {
    return false;
  }

  if (requireChildReferences && !hasValidChildReferences(elements)) {
    return false;
  }

  return true;
}

function isValidElement(element: unknown): boolean {
  if (typeof element !== "object" || element === null) {
    return false;
  }

  const candidate = element as Record<string, unknown>;

  if (typeof candidate.type !== "string" || candidate.type.length === 0) {
    return false;
  }

  if (
    "props" in candidate &&
    candidate.props !== undefined &&
    (typeof candidate.props !== "object" ||
      candidate.props === null ||
      Array.isArray(candidate.props))
  ) {
    return false;
  }

  if (
    "children" in candidate &&
    candidate.children !== undefined &&
    (!Array.isArray(candidate.children) ||
      candidate.children.some((childId) => typeof childId !== "string"))
  ) {
    return false;
  }

  return true;
}

function hasValidChildReferences(elements: Record<string, unknown>): boolean {
  for (const element of Object.values(elements)) {
    const candidate = element as Record<string, unknown>;
    const children = candidate.children;

    if (!children) {
      continue;
    }

    for (const childId of children as unknown[]) {
      if (
        typeof childId !== "string" ||
        !Object.prototype.hasOwnProperty.call(elements, childId)
      ) {
        return false;
      }
    }
  }

  return true;
}

function closeJson(input: string): string | null {
  let result = input;
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < result.length; i++) {
    const ch = result[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      if (inString) escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }

  // Close unclosed string
  if (inString) {
    result += '"';
  }

  // Remove trailing comma before closing
  result = result.replace(/,\s*$/, "");

  // Close all unclosed brackets/braces
  while (stack.length > 0) {
    result += stack.pop();
  }

  return result;
}
