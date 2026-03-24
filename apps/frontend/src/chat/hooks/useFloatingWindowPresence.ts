import { useEffect, useRef, useState } from "react";

import type {
  MessageRecord,
  MessagesByWindowId,
  WindowScrollState,
  WindowRecord,
} from "../../types";

const EMPTY_MESSAGES: MessageRecord[] = [];
const DEFAULT_SCROLL_STATE: WindowScrollState = {
  scrollTop: null,
  shouldAutoScroll: true,
};
const FLOATING_WINDOW_EXIT_DURATION_MS = 220;

export { FLOATING_WINDOW_EXIT_DURATION_MS };

export interface FloatingWindowPresenceEntry {
  enterKind: "branch" | "newNote";
  isExiting: boolean;
  messages: MessageRecord[];
  savedScrollState: WindowScrollState;
  windowData: WindowRecord;
  zIndex: number;
}

interface UseFloatingWindowPresenceOptions {
  messagesByWindowId: MessagesByWindowId;
  windows: WindowRecord[];
  windowScrollStates: Record<string, WindowScrollState>;
}

/**
 * Manages the animated presence lifecycle of floating workspace windows.
 *
 * Tracks enter/exit transitions so that removed windows fade out before being
 * unmounted rather than disappearing instantly.
 */
export function useFloatingWindowPresence({
  messagesByWindowId,
  windows,
  windowScrollStates,
}: UseFloatingWindowPresenceOptions): FloatingWindowPresenceEntry[] {
  const exitTimeoutsRef = useRef<Record<string, number>>({});
  const [floatingWindowEntries, setFloatingWindowEntries] = useState<
    FloatingWindowPresenceEntry[]
  >(() =>
    windows.map((windowData, index) => ({
      enterKind: windowData.parentId === null ? "newNote" : "branch",
      isExiting: false,
      messages: messagesByWindowId[windowData.id] ?? EMPTY_MESSAGES,
      savedScrollState:
        windowScrollStates[windowData.id] ?? DEFAULT_SCROLL_STATE,
      windowData,
      zIndex: index + 1,
    })),
  );

  useEffect(() => {
    setFloatingWindowEntries((current) => {
      const currentById = new Map(
        current.map((entry) => [entry.windowData.id, entry] as const),
      );
      const nextIds = new Set(windows.map((windowData) => windowData.id));
      const nextEntries: FloatingWindowPresenceEntry[] = windows.map(
        (windowData, index) => {
          const existing = currentById.get(windowData.id);

          return {
            enterKind:
              existing?.enterKind ??
              (windowData.parentId === null ? "newNote" : "branch"),
            isExiting: false,
            messages:
              messagesByWindowId[windowData.id] ??
              existing?.messages ??
              EMPTY_MESSAGES,
            savedScrollState:
              windowScrollStates[windowData.id] ??
              existing?.savedScrollState ??
              DEFAULT_SCROLL_STATE,
            windowData,
            zIndex: index + 1,
          };
        },
      );

      current.forEach((entry) => {
        if (!nextIds.has(entry.windowData.id)) {
          nextEntries.push({
            ...entry,
            isExiting: true,
          });
        }
      });

      return nextEntries;
    });
  }, [windows, messagesByWindowId, windowScrollStates]);

  useEffect(() => {
    floatingWindowEntries.forEach((entry) => {
      const windowId = entry.windowData.id;

      if (entry.isExiting) {
        if (exitTimeoutsRef.current[windowId]) {
          return;
        }

        exitTimeoutsRef.current[windowId] = window.setTimeout(() => {
          setFloatingWindowEntries((current) =>
            current.filter(
              (candidate) => candidate.windowData.id !== windowId,
            ),
          );
          delete exitTimeoutsRef.current[windowId];
        }, FLOATING_WINDOW_EXIT_DURATION_MS);
        return;
      }

      const activeTimeout = exitTimeoutsRef.current[windowId];
      if (activeTimeout) {
        window.clearTimeout(activeTimeout);
        delete exitTimeoutsRef.current[windowId];
      }
    });
  }, [floatingWindowEntries]);

  useEffect(() => {
    return () => {
      Object.values(exitTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      exitTimeoutsRef.current = {};
    };
  }, []);

  return floatingWindowEntries;
}
