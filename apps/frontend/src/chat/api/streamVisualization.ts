import type {
  ReasoningEffort,
  VisualizationPreviewShape,
  VisualizationRecord,
} from "../../types";

export interface VisualizationStatusEvent {
  phase: "planning";
  message: string;
}

export interface VisualizationFinalPayload {
  title: string;
  shapes: VisualizationPreviewShape[];
  assets: VisualizationRecord["assets"];
  bindings: VisualizationRecord["bindings"];
}

interface StreamVisualizationOptions {
  prompt?: string | null;
  selectedText: string;
  sourceMessage: string;
  sourceTitle: string;
  model?: string | null;
  effort?: ReasoningEffort | null;
  signal?: AbortSignal;
  onStatus: (event: VisualizationStatusEvent) => void;
  onFinal: (payload: VisualizationFinalPayload) => void;
}

type StreamEvent =
  | {
      type: "status";
      phase: "planning";
      message: string;
    }
  | ({
      type: "final";
    } & VisualizationFinalPayload)
  | {
      type: "error";
      message?: string;
    }
  | {
      type: "done";
    };

function parseStreamEvent(line: string): StreamEvent {
  const value: unknown = JSON.parse(line);

  if (!value || typeof value !== "object") {
    throw new Error("The server returned an invalid visualization stream event.");
  }

  const event = value as Record<string, unknown>;

  if (
    event.type === "status" &&
    event.phase === "planning" &&
    typeof event.message === "string"
  ) {
    return {
      type: "status",
      phase: "planning",
      message: event.message,
    };
  }

  if (
    event.type === "final" &&
    typeof event.title === "string" &&
    Array.isArray(event.shapes) &&
    Array.isArray(event.assets) &&
    Array.isArray(event.bindings)
  ) {
    return {
      type: "final",
      title: event.title,
      shapes: event.shapes as VisualizationPreviewShape[],
      assets: event.assets as VisualizationRecord["assets"],
      bindings: event.bindings as VisualizationRecord["bindings"],
    };
  }

  if (event.type === "error") {
    return {
      type: "error",
      message: typeof event.message === "string" ? event.message : undefined,
    };
  }

  if (event.type === "done") {
    return {
      type: "done",
    };
  }

  throw new Error("The server returned an unknown visualization stream event.");
}

export async function streamVisualization({
  selectedText,
  sourceMessage,
  sourceTitle,
  prompt,
  model,
  effort,
  signal,
  onStatus,
  onFinal,
}: StreamVisualizationOptions): Promise<void> {
  const response = await fetch("/api/visualizations/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt ?? null,
      selected_text: selectedText,
      source_message: sourceMessage,
      source_title: sourceTitle,
      model,
      effort: effort ?? null,
    }),
    signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (!response.body) {
    throw new Error("The server did not return a readable visualization stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (line) {
        const event = parseStreamEvent(line);

        if (event.type === "status") {
          onStatus({
            phase: event.phase,
            message: event.message,
          });
        } else if (event.type === "final") {
          onFinal(event);
        } else if (event.type === "error") {
          throw new Error(
            event.message || "The visualization stream failed.",
          );
        } else {
          return;
        }
      }

      newlineIndex = buffer.indexOf("\n");
    }

    if (done) {
      break;
    }
  }

  if (!buffer.trim()) {
    return;
  }

  const finalEvent = parseStreamEvent(buffer.trim());

  if (finalEvent.type === "status") {
    onStatus({
      phase: finalEvent.phase,
      message: finalEvent.message,
    });
    return;
  }

  if (finalEvent.type === "final") {
    onFinal(finalEvent);
    return;
  }

  if (finalEvent.type === "error") {
    throw new Error(finalEvent.message || "The visualization stream failed.");
  }
}
