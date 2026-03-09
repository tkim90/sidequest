import type { BranchFocus, ChatMessage } from "../../types";

interface StreamChatOptions {
  messages: ChatMessage[];
  branchFocus: BranchFocus | null;
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
}

type StreamEvent =
  | {
      type: "delta";
      text: string;
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

  if (event.type === "delta" && typeof event.text === "string") {
    return {
      type: "delta",
      text: event.text,
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
  signal,
  onDelta,
}: StreamChatOptions): Promise<void> {
  const response = await fetch("/api/chat/stream", {
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

        if (event.type === "delta") {
          onDelta(event.text);
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

  if (finalEvent.type === "delta") {
    onDelta(finalEvent.text);
    return;
  }

  if (finalEvent.type === "error") {
    throw new Error(finalEvent.message || "The model stream failed.");
  }
}
