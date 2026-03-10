import {
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { AppState } from "../../types";
import { appendAssistantDelta } from "../lib/workspaceActions";

const BATCH_INTERVAL_MS = 80;

interface DeltaStream {
  windowId: string;
  assistantMessageId: string;
  buffer: string;
  timerId: number | null;
}

interface DeltaBatcherHandle {
  push: (delta: string) => void;
  flush: () => void;
}

interface DeltaBatcher {
  start: (windowId: string, assistantMessageId: string) => DeltaBatcherHandle;
  cancel: (windowId: string) => void;
}

export function useDeltaBatcher(
  setAppState: Dispatch<SetStateAction<AppState>>,
  requestGeometryRefresh: () => void,
): DeltaBatcher {
  const streamsRef = useRef<Record<string, DeltaStream>>({});

  const flushStream = useCallback(
    (windowId: string) => {
      const stream = streamsRef.current[windowId];
      if (!stream || stream.buffer.length === 0) {
        return;
      }

      const buffered = stream.buffer;
      stream.buffer = "";

      setAppState((current) =>
        appendAssistantDelta(
          current,
          stream.windowId,
          stream.assistantMessageId,
          buffered,
        ),
      );
      requestGeometryRefresh();
    },
    [setAppState, requestGeometryRefresh],
  );

  const clearTimer = useCallback((stream: DeltaStream) => {
    if (stream.timerId !== null) {
      window.clearTimeout(stream.timerId);
      stream.timerId = null;
    }
  }, []);

  const scheduleFlush = useCallback(
    (windowId: string) => {
      const stream = streamsRef.current[windowId];
      if (!stream || stream.timerId !== null) {
        return;
      }

      stream.timerId = window.setTimeout(() => {
        stream.timerId = null;
        flushStream(windowId);
      }, BATCH_INTERVAL_MS);
    },
    [flushStream],
  );

  const start = useCallback(
    (windowId: string, assistantMessageId: string): DeltaBatcherHandle => {
      const existing = streamsRef.current[windowId];
      if (existing) {
        clearTimer(existing);
      }

      const stream: DeltaStream = {
        windowId,
        assistantMessageId,
        buffer: "",
        timerId: null,
      };
      streamsRef.current[windowId] = stream;

      return {
        push: (delta: string) => {
          stream.buffer += delta;
          scheduleFlush(windowId);
        },
        flush: () => {
          clearTimer(stream);
          flushStream(windowId);
          delete streamsRef.current[windowId];
        },
      };
    },
    [clearTimer, flushStream, scheduleFlush],
  );

  const cancel = useCallback(
    (windowId: string) => {
      const stream = streamsRef.current[windowId];
      if (stream) {
        clearTimer(stream);
        delete streamsRef.current[windowId];
      }
    },
    [clearTimer],
  );

  return { start, cancel };
}
