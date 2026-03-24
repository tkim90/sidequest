import type { JsonRenderSpec } from "./types";

interface ImageRenderSnapshot {
  error: string | null;
  isLoading: boolean;
  svgUrl: string | null;
}

interface ImageRenderRecord {
  controller: AbortController | null;
  listeners: Set<() => void>;
  partial: boolean;
  spec: JsonRenderSpec;
  snapshot: ImageRenderSnapshot;
  timerId: number | null;
}

const STREAMING_RENDER_DELAY_MS = 1500;
const INITIAL_IMAGE_RENDER_SNAPSHOT: ImageRenderSnapshot = {
  error: null,
  isLoading: true,
  svgUrl: null,
};

const imageRenderRecords = new Map<string, ImageRenderRecord>();

function emitRecord(record: ImageRenderRecord): void {
  record.listeners.forEach((listener) => {
    listener();
  });
}

function clearScheduledRender(record: ImageRenderRecord): void {
  if (record.timerId === null) {
    return;
  }

  window.clearTimeout(record.timerId);
  record.timerId = null;
}

function abortActiveRender(record: ImageRenderRecord): void {
  if (!record.controller) {
    return;
  }

  record.controller.abort();
  record.controller = null;
}

function getImageRenderRecord(
  key: string,
  spec: JsonRenderSpec,
  partial: boolean,
): ImageRenderRecord {
  const existing = imageRenderRecords.get(key);
  if (existing) {
    existing.spec = spec;
    existing.partial = partial;
    return existing;
  }

  const record: ImageRenderRecord = {
    controller: null,
    listeners: new Set(),
    partial,
    spec,
    snapshot: INITIAL_IMAGE_RENDER_SNAPSHOT,
    timerId: null,
  };
  imageRenderRecords.set(key, record);
  return record;
}

async function startImageRender(record: ImageRenderRecord): Promise<void> {
  clearScheduledRender(record);

  if (record.controller) {
    return;
  }

  const controller = new AbortController();
  record.controller = controller;
  record.snapshot = {
    error: null,
    isLoading: true,
    svgUrl: null,
  };
  emitRecord(record);

  try {
    const response = await fetch("/api/image/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spec: record.spec, format: "svg" }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const svgText = await response.text();
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;

    if (record.controller !== controller) {
      return;
    }

    record.snapshot = {
      error: null,
      isLoading: false,
      svgUrl,
    };
    emitRecord(record);
  } catch (error: unknown) {
    if (controller.signal.aborted || record.controller !== controller) {
      return;
    }

    record.snapshot = {
      error: error instanceof Error ? error.message : "Unknown image render error",
      isLoading: false,
      svgUrl: null,
    };
    emitRecord(record);
  } finally {
    if (record.controller === controller) {
      record.controller = null;
    }
  }
}

function scheduleImageRender(record: ImageRenderRecord): void {
  if (record.snapshot.svgUrl || record.snapshot.error) {
    return;
  }

  clearScheduledRender(record);

  const delayMs = record.partial ? STREAMING_RENDER_DELAY_MS : 0;
  if (delayMs <= 0) {
    void startImageRender(record);
    return;
  }

  record.timerId = window.setTimeout(() => {
    record.timerId = null;
    void startImageRender(record);
  }, delayMs);
}

export function getServerImageRenderSnapshot(): ImageRenderSnapshot {
  return INITIAL_IMAGE_RENDER_SNAPSHOT;
}

export function getImageRenderSnapshot(
  key: string,
  spec: JsonRenderSpec,
  partial: boolean,
): ImageRenderSnapshot {
  const record = getImageRenderRecord(key, spec, partial);
  return record.snapshot;
}

export function subscribeToImageRender(
  key: string,
  spec: JsonRenderSpec,
  partial: boolean,
  onStoreChange: () => void,
): () => void {
  const record = getImageRenderRecord(key, spec, partial);
  record.listeners.add(onStoreChange);
  scheduleImageRender(record);

  return () => {
    record.listeners.delete(onStoreChange);

    if (record.listeners.size > 0) {
      return;
    }

    clearScheduledRender(record);
    abortActiveRender(record);
  };
}
