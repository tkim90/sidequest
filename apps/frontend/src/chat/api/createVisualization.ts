import type {
  ReasoningEffort,
  VisualizationPreviewShape,
  VisualizationRecord,
} from "../../types";

interface CreateVisualizationOptions {
  prompt?: string | null;
  selectedText: string;
  sourceMessage: string;
  sourceTitle: string;
  model?: string | null;
  effort?: ReasoningEffort | null;
  signal?: AbortSignal;
}

interface VisualizationResponsePayload {
  title: string;
  shapes: VisualizationPreviewShape[];
  assets: VisualizationRecord["assets"];
  bindings: VisualizationRecord["bindings"];
}

export async function createVisualization({
  selectedText,
  sourceMessage,
  sourceTitle,
  prompt,
  model,
  effort,
  signal,
}: CreateVisualizationOptions): Promise<VisualizationResponsePayload> {
  const response = await fetch("/api/visualizations", {
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

  const bodyText = await response.text();
  let body: unknown = null;
  if (bodyText) {
    try {
      body = JSON.parse(bodyText) as unknown;
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const detail =
      body && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string"
        ? (body as { detail: string }).detail
        : null;
    throw new Error(detail || bodyText || `Request failed with ${response.status}`);
  }

  if (!body || typeof body !== "object") {
    throw new Error("The server returned an invalid visualization response.");
  }

  const payload = body as Partial<VisualizationResponsePayload>;
  if (
    typeof payload.title !== "string" ||
    !Array.isArray(payload.shapes) ||
    !Array.isArray(payload.assets) ||
    !Array.isArray(payload.bindings)
  ) {
    throw new Error("The server returned an incomplete visualization response.");
  }

  return {
    title: payload.title,
    shapes: payload.shapes,
    assets: payload.assets,
    bindings: payload.bindings,
  };
}
