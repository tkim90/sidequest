/**
 * Client-side safeguards: input limits, cooldown, and session tracking.
 */

// ---------------------------------------------------------------------------
// Input limits (match backend defaults)
// ---------------------------------------------------------------------------

export const MAX_CHARS_PER_MESSAGE = 1500;
export const MAX_MESSAGES = 20;
export const MAX_TOTAL_CHARS = 8000;

// ---------------------------------------------------------------------------
// Cooldown between sends (milliseconds)
// ---------------------------------------------------------------------------

export const SEND_COOLDOWN_MS = 2000;

// ---------------------------------------------------------------------------
// Session ID (survives page refresh within the same tab)
// ---------------------------------------------------------------------------

const SESSION_STORAGE_KEY = "sidequest_session_id";

export function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

// ---------------------------------------------------------------------------
// Parse rate-limit errors from the backend
// ---------------------------------------------------------------------------

interface RateLimitInfo {
  detail: string;
  retryAfter: number | null;
}

export function parseRateLimitResponse(
  status: number,
  body: string,
  retryAfterHeader: string | null,
): RateLimitInfo | null {
  if (status !== 429 && status !== 503) {
    return null;
  }

  let detail = "Rate limit exceeded. Please try again later.";
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "detail" in parsed) {
      const obj = parsed as { detail: string };
      if (typeof obj.detail === "string") {
        detail = obj.detail;
      }
    }
  } catch {
    // Use default message
  }

  let retryAfter: number | null = null;
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds) && seconds > 0) {
      retryAfter = seconds;
    }
  }

  return { detail, retryAfter };
}

/**
 * Format a retry-after countdown for display.
 */
export function formatRetryAfter(seconds: number): string {
  if (seconds <= 0) return "";
  if (seconds < 60) return `Try again in ${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `Try again in ${minutes}m`;
}
