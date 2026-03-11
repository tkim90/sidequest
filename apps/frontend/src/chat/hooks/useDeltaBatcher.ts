import {
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { AppState } from "../../types";
import {
  appendAssistantDelta,
  appendAssistantReasoningDelta,
} from "../lib/workspaceActions";

const BATCH_INTERVAL_MS = 80;

interface DeltaStream {
  windowId: string;
  assistantMessageId: string;
  contentBuffer: string;
  reasoningRawBuffer: string;
  reasoningSummaryBuffer: string;
  timerId: number | null;
}

interface DeltaBatcherHandle {
  pushContent: (delta: string) => void;
  pushReasoning: (format: "raw" | "summary", delta: string) => void;
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
      if (
        !stream ||
        (
          stream.contentBuffer.length === 0 &&
          stream.reasoningRawBuffer.length === 0 &&
          stream.reasoningSummaryBuffer.length === 0
        )
      ) {
        return;
      }

      const contentBuffer = stream.contentBuffer;
      const reasoningRawBuffer = stream.reasoningRawBuffer;
      const reasoningSummaryBuffer = stream.reasoningSummaryBuffer;

      stream.contentBuffer = "";
      stream.reasoningRawBuffer = "";
      stream.reasoningSummaryBuffer = "";

      setAppState((current) => {
        let nextState = current;

        if (contentBuffer) {
          nextState = appendAssistantDelta(
            nextState,
            stream.windowId,
            stream.assistantMessageId,
            contentBuffer,
          );
        }

        if (reasoningRawBuffer) {
          nextState = appendAssistantReasoningDelta(
            nextState,
            stream.windowId,
            stream.assistantMessageId,
            reasoningRawBuffer,
            "raw",
          );
        }

        if (reasoningSummaryBuffer) {
          nextState = appendAssistantReasoningDelta(
            nextState,
            stream.windowId,
            stream.assistantMessageId,
            reasoningSummaryBuffer,
            "summary",
          );
        }

        return nextState;
      });
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
        contentBuffer: "",
        reasoningRawBuffer: "",
        reasoningSummaryBuffer: "",
        timerId: null,
      };
      streamsRef.current[windowId] = stream;

      return {
        pushContent: (delta: string) => {
          stream.contentBuffer += delta;
          scheduleFlush(windowId);
        },
        pushReasoning: (format: "raw" | "summary", delta: string) => {
          if (format === "raw") {
            stream.reasoningRawBuffer += delta;
          } else {
            stream.reasoningSummaryBuffer += delta;
          }
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
