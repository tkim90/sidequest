import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile integration (invisible mode).
 *
 * When VITE_TURNSTILE_SITE_KEY is set, the hook loads the Turnstile script,
 * renders an invisible widget, and provides `getToken()` to retrieve a fresh
 * challenge token before each expensive API call.
 *
 * When the env var is absent the hook is a no-op and `getToken()` returns null.
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileHook {
  /** Get a fresh turnstile token, or null if turnstile is not configured. */
  getToken: () => Promise<string | null>;
  /** Ref to attach to a hidden container div for the invisible widget. */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// Augment window for turnstile global
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          size: "invisible";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }

    const existing = document.querySelector(
      `script[src^="https://challenges.cloudflare.com/turnstile"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile script"));
    document.head.appendChild(script);
  });
}

export function useTurnstile(): TurnstileHook {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const resolverRef = useRef<((token: string) => void) | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load script once
  useEffect(() => {
    if (!SITE_KEY) return;

    void loadScript().then(() => setScriptLoaded(true));
  }, []);

  // Render widget once script + container are ready
  useEffect(() => {
    if (!SITE_KEY || !scriptLoaded || !window.turnstile || !containerRef.current) {
      return;
    }

    if (widgetIdRef.current !== null) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      size: "invisible",
      callback: (token: string) => {
        if (resolverRef.current) {
          resolverRef.current(token);
          resolverRef.current = null;
        }
      },
      "error-callback": () => {
        if (resolverRef.current) {
          resolverRef.current("");
          resolverRef.current = null;
        }
      },
      "expired-callback": () => {
        // Token expired — will re-challenge on next getToken call
      },
    });

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!SITE_KEY || !window.turnstile || widgetIdRef.current === null) {
      return null;
    }

    // Reset the widget to trigger a fresh challenge
    window.turnstile.reset(widgetIdRef.current);

    return new Promise<string | null>((resolve) => {
      resolverRef.current = (token: string) => {
        resolve(token || null);
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (resolverRef.current) {
          resolverRef.current = null;
          resolve(null);
        }
      }, 10_000);
    });
  }, []);

  return { getToken, containerRef };
}
