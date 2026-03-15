import type {
  BranchFocus,
  ChatMessage,
  ChatModelOption,
  ReasoningEffort,
} from "../../types";
import { apiUrl } from "../../config/env";

const DEFAULT_REASONING_EFFORTS: ReasoningEffort[] = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
];

interface StreamChatOptions {
  messages: ChatMessage[];
  branchFocus: BranchFocus | null;
  model?: string | null;
  effort?: ReasoningEffort | null;
  signal?: AbortSignal;
  onContentDelta: (delta: string) => void;
  onReasoningDelta: (format: "raw" | "summary", delta: string) => void;
}

export interface ChatModelConfig {
  models: ChatModelOption[];
  defaultModel: string | null;
}

type StreamEvent =
  | {
      type: "content_delta";
      text: string;
    }
  | {
      type: "reasoning_delta";
      text: string;
      format: "raw" | "summary";
    }
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
    throw new Error("The server returned an invalid stream event.");
  }

  const event = value as Record<string, unknown>;

  if (
    (event.type === "delta" || event.type === "content_delta") &&
    typeof event.text === "string"
  ) {
    return {
      type: "content_delta",
      text: event.text,
    };
  }

  if (
    event.type === "reasoning_delta" &&
    typeof event.text === "string" &&
    (event.format === "raw" || event.format === "summary")
  ) {
    return {
      type: "reasoning_delta",
      text: event.text,
      format: event.format,
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

  throw new Error("The server returned an unknown stream event.");
}

export async function streamChat({
  messages,
  branchFocus,
  model,
  effort,
  signal,
  onContentDelta,
  onReasoningDelta,
}: StreamChatOptions): Promise<void> {
  const response = await fetch(apiUrl("/chat/stream"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      branch_focus: branchFocus
        ? {
            selected_text: branchFocus.selectedText,
            parent_window_title: branchFocus.parentWindowTitle,
            parent_message_role: branchFocus.parentMessageRole,
          }
        : null,
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
    throw new Error("The server did not return a readable stream.");
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

        if (event.type === "content_delta") {
          onContentDelta(event.text);
        } else if (event.type === "reasoning_delta") {
          onReasoningDelta(event.format, event.text);
        } else if (event.type === "error") {
          throw new Error(event.message || "The model stream failed.");
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

  if (finalEvent.type === "content_delta") {
    onContentDelta(finalEvent.text);
    return;
  }

  if (finalEvent.type === "reasoning_delta") {
    onReasoningDelta(finalEvent.format, finalEvent.text);
    return;
  }

  if (finalEvent.type === "error") {
    throw new Error(finalEvent.message || "The model stream failed.");
  }
}

export async function fetchChatModelConfig(
  signal?: AbortSignal,
): Promise<ChatModelConfig> {
  const response = await fetch(apiUrl("/chat/models"), {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  const value: unknown = await response.json();

  if (!value || typeof value !== "object") {
    throw new Error("The server returned an invalid model config response.");
  }

  const payload = value as Record<string, unknown>;
  const defaultModel =
    typeof payload.default_model === "string"
      ? payload.default_model
      : null;
  const models = Array.isArray(payload.models)
    ? payload.models.flatMap((model): ChatModelOption[] => {
        if (!model || typeof model !== "object") {
          return [];
        }

        const candidate = model as Record<string, unknown>;
        if (typeof candidate.id !== "string") {
          return [];
        }

        const efforts = Array.isArray(candidate.efforts)
          ? candidate.efforts.filter(
              (effort): effort is ReasoningEffort =>
                typeof effort === "string" &&
                DEFAULT_REASONING_EFFORTS.includes(effort as ReasoningEffort),
            )
          : [];
        const defaultEffort =
          typeof candidate.default_effort === "string" &&
          efforts.includes(candidate.default_effort as ReasoningEffort)
            ? (candidate.default_effort as ReasoningEffort)
            : null;

        return [
          {
            id: candidate.id,
            efforts,
            defaultEffort,
          },
        ];
      })
    : [];

  return {
    models,
    defaultModel,
  };
}
