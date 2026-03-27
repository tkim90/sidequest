import type {
  Editor,
  TLBindingCreate,
  TLShapeId,
  TLShapePartial,
} from "tldraw";

import type { VisualizationPreviewShape } from "../../types";

const VISUALIZATION_INSET_PX = 24;
const DEFAULT_TEXT_FONT_SIZE = 26;

interface VisualizationShapePayload {
  bindings: TLBindingCreate[];
  shapes: VisualizationPreviewShape[];
}

interface VisualizationShapeDescriptor {
  id: string;
  parentId: string | null;
  type: string;
}

type VisualizationBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type EstimatedTextBounds = {
  height: number;
  width: number;
};

type TldrawFillStyle = "none" | "semi" | "solid" | "pattern" | "fill" | "lined-fill";

function toTldrawShapeId(shapeId: string): TLShapeId {
  return (shapeId.startsWith("shape:") ? shapeId : `shape:${shapeId}`) as TLShapeId;
}

function toBindingRecord(binding: TLBindingCreate): TLBindingCreate {
  return {
    ...binding,
    fromId:
      typeof binding.fromId === "string"
        ? toTldrawShapeId(binding.fromId)
        : binding.fromId,
    toId:
      typeof binding.toId === "string"
        ? toTldrawShapeId(binding.toId)
        : binding.toId,
  };
}

function toRichText(text: string): {
  type: "doc";
  content: Array<{
    type: "paragraph";
    content?: Array<{
      type: "text";
      text: string;
    }>;
  }>;
} {
  return {
    type: "doc",
    content: text
      .split("\n")
      .map((line) =>
        line
          ? {
              type: "paragraph" as const,
              content: [
                {
                  type: "text" as const,
                  text: line,
                },
              ],
            }
          : {
              type: "paragraph" as const,
            },
      ),
  };
}

function coerceNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function coercePositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function coerceText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function mapPreviewFill(fill: unknown): TldrawFillStyle {
  switch (fill) {
    case "none":
      return "none";
    case "tint":
      return "solid";
    case "background":
      return "semi";
    case "solid":
      return "fill";
    case "pattern":
      return "pattern";
    case "fill":
    case "lined-fill":
    case "semi":
      return fill;
    default:
      return "solid";
  }
}

function mapPreviewGeoType(shapeType: string): string {
  switch (shapeType) {
    case "rectangle":
      return "rectangle";
    case "ellipse":
      return "ellipse";
    case "triangle":
      return "triangle";
    case "diamond":
      return "diamond";
    case "hexagon":
      return "hexagon";
    case "pill":
      return "oval";
    case "cloud":
      return "cloud";
    case "x-box":
      return "x-box";
    case "check-box":
      return "check-box";
    case "heart":
      return "heart";
    case "pentagon":
      return "pentagon";
    case "octagon":
      return "octagon";
    case "star":
      return "star";
    case "parallelogram-right":
      return "trapezoid";
    case "parallelogram-left":
      return "trapezoid";
    case "trapezoid":
      return "trapezoid";
    case "fat-arrow-right":
      return "arrow-right";
    case "fat-arrow-left":
      return "arrow-left";
    case "fat-arrow-up":
      return "arrow-up";
    case "fat-arrow-down":
      return "arrow-down";
    default:
      return "rectangle";
  }
}

function resolveTextAlign(shape: VisualizationPreviewShape): "start" | "middle" | "end" {
  if (shape.textAlign === "end" || shape.textAlign === "middle") {
    return shape.textAlign;
  }

  switch (shape.anchor) {
    case "bottom-center":
    case "center":
    case "top-center":
      return "middle";
    case "bottom-right":
    case "center-right":
    case "top-right":
      return "end";
    default:
      return "start";
  }
}

function estimateTextBounds(
  text: string,
  shape: VisualizationPreviewShape,
): EstimatedTextBounds {
  const fontSize = coercePositiveNumber(shape.fontSize, DEFAULT_TEXT_FONT_SIZE);
  const charWidth = fontSize * 0.7;
  const lineHeight = fontSize * 1.25;
  const maxWidth =
    typeof shape.maxWidth === "number" && Number.isFinite(shape.maxWidth) && shape.maxWidth > 0
      ? shape.maxWidth
      : null;
  const maxCharsPerLine = maxWidth
    ? Math.max(1, Math.floor(maxWidth / charWidth))
    : Number.POSITIVE_INFINITY;

  let lineCount = 0;
  let maxLineChars = 1;

  for (const line of text.split("\n")) {
    const normalizedLine = line || " ";
    if (Number.isFinite(maxCharsPerLine)) {
      const wrappedLineCount = Math.max(
        1,
        Math.ceil(normalizedLine.length / maxCharsPerLine),
      );
      lineCount += wrappedLineCount;
      maxLineChars = Math.max(
        maxLineChars,
        Math.min(normalizedLine.length, maxCharsPerLine),
      );
      continue;
    }

    lineCount += 1;
    maxLineChars = Math.max(maxLineChars, normalizedLine.length);
  }

  return {
    width: maxWidth ?? Math.max(charWidth, maxLineChars * charWidth),
    height: Math.max(lineHeight, lineCount * lineHeight),
  };
}

function resolveTextOrigin(
  shape: VisualizationPreviewShape,
  bounds: EstimatedTextBounds,
): { x: number; y: number } {
  const x = coerceNumber(shape.x, 0);
  const y = coerceNumber(shape.y, 0);

  switch (shape.anchor) {
    case "bottom-center":
      return { x: x - bounds.width / 2, y: y - bounds.height };
    case "bottom-left":
      return { x, y: y - bounds.height };
    case "bottom-right":
      return { x: x - bounds.width, y: y - bounds.height };
    case "center-left":
      return { x, y: y - bounds.height / 2 };
    case "center-right":
      return { x: x - bounds.width, y: y - bounds.height / 2 };
    case "center":
      return { x: x - bounds.width / 2, y: y - bounds.height / 2 };
    case "top-center":
      return { x: x - bounds.width / 2, y };
    case "top-right":
      return { x: x - bounds.width, y };
    case "top-left":
    default:
      return { x, y };
  }
}

function createPreviewShapePartial(
  shape: VisualizationPreviewShape,
): TLShapePartial | null {
  const externalShapeId = coerceText(shape.shapeId, "");
  if (!externalShapeId) {
    return null;
  }
  const shapeId = toTldrawShapeId(externalShapeId);

  const label = coerceText(shape.text, coerceText(shape.note, externalShapeId));
  const color = coerceText(shape.color, "black");
  const dash = coerceText(shape.dash, "draw");
  const size = coerceText(shape.size, "m");
  const font = coerceText(shape.font, "draw");
  const textAlign = resolveTextAlign(shape);

  switch (shape._type) {
    case "text": {
      const textBounds = estimateTextBounds(label, shape);
      const origin = resolveTextOrigin(shape, textBounds);
      return {
        id: shapeId,
        type: "text",
        x: origin.x,
        y: origin.y,
        props: {
          richText: toRichText(label),
          color,
          size,
          font,
          textAlign,
          autoSize: shape.maxWidth == null,
          w: coercePositiveNumber(shape.maxWidth, textBounds.width),
          scale: 1,
        },
      } as unknown as TLShapePartial;
    }
    case "note":
      return {
        id: shapeId,
        type: "note",
        x: coerceNumber(shape.x, 0),
        y: coerceNumber(shape.y, 0),
        props: {
          color,
          richText: toRichText(label),
          size,
          font,
          align: "middle",
          verticalAlign: "middle",
          fontSizeAdjustment: 0,
          growY: 0,
          labelColor: "black",
          scale: 1,
          url: "",
        },
      } as unknown as TLShapePartial;
    case "frame":
      return {
        id: shapeId,
        type: "frame",
        x: coerceNumber(shape.x, 0),
        y: coerceNumber(shape.y, 0),
        props: {
          w: coerceNumber(shape.w, 320),
          h: coerceNumber(shape.h, 240),
          name: coerceText(shape.name, label === shapeId ? "" : label),
          color,
        },
      } as unknown as TLShapePartial;
    case "arrow":
    case "line": {
      const x1 = coerceNumber(shape.x1, 0);
      const y1 = coerceNumber(shape.y1, 0);
      const x2 = coerceNumber(shape.x2, x1 + 240);
      const y2 = coerceNumber(shape.y2, y1);
      return {
        id: shapeId,
        type: "arrow",
        x: x1,
        y: y1,
        props: {
          color,
          dash,
          size,
          fill: "none",
          font,
          arrowheadStart: "none",
          arrowheadEnd: shape._type === "line" ? "none" : "arrow",
          start: {
            x: 0,
            y: 0,
          },
          end: {
            x: x2 - x1,
            y: y2 - y1,
          },
          bend: coerceNumber(shape.bend, 0),
          richText: toRichText(coerceText(shape.text, "")),
          labelColor: "black",
          labelPosition: 0.5,
          scale: 1,
          kind: "arc",
          elbowMidPoint: 0.5,
        },
      } as unknown as TLShapePartial;
    }
    default:
      return {
        id: shapeId,
        type: "geo",
        x: coerceNumber(shape.x, 0),
        y: coerceNumber(shape.y, 0),
        props: {
          geo: mapPreviewGeoType(shape._type),
          w: coerceNumber(shape.w, 240),
          h: coerceNumber(shape.h, 120),
          color,
          fill: mapPreviewFill(shape.fill),
          dash,
          size,
          font,
          align: textAlign,
          verticalAlign: "middle",
          growY: 0,
          richText: toRichText(label),
          labelColor: "black",
          scale: 1,
          url: "",
        },
      } as unknown as TLShapePartial;
  }
}

function resolveBoundsFromShapeIds(
  editor: Editor,
  shapeIds: string[],
): VisualizationBounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const shapeId of shapeIds) {
    const bounds = editor.getShapePageBounds(shapeId as never);
    if (!bounds) {
      continue;
    }

    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.w);
    maxY = Math.max(maxY, bounds.y + bounds.h);
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY) ||
    maxX <= minX ||
    maxY <= minY
  ) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

function collectFrameDescendants(
  shapesById: Map<string, VisualizationShapeDescriptor>,
  frameId: string,
): string[] {
  const descendants: string[] = [];

  for (const shape of shapesById.values()) {
    if (shape.id === frameId || shape.type === "frame") {
      continue;
    }

    let parentId = shape.parentId;
    while (parentId) {
      if (parentId === frameId) {
        descendants.push(shape.id);
        break;
      }

      parentId = shapesById.get(parentId)?.parentId ?? null;
    }
  }

  return descendants;
}

export function resolveVisualizationFocusShapeIds(
  shapes: VisualizationShapeDescriptor[],
): string[] {
  if (shapes.length === 0) {
    return [];
  }

  const nonFrameIds = shapes
    .filter((shape) => shape.type !== "frame")
    .map((shape) => shape.id);
  if (nonFrameIds.length === 0) {
    return shapes.map((shape) => shape.id);
  }

  const topLevelFrames = shapes.filter(
    (shape) => shape.type === "frame" && shape.parentId === "page:page",
  );
  if (topLevelFrames.length === 1) {
    const descendants = collectFrameDescendants(
      new Map(shapes.map((shape) => [shape.id, shape])),
      topLevelFrames[0].id,
    );
    if (descendants.length > 0) {
      return descendants;
    }
  }

  return nonFrameIds;
}

export function getVisualizationShapeDescriptors(
  snapshot: VisualizationShapePayload,
): VisualizationShapeDescriptor[] {
  return snapshot.shapes.map((shape) => ({
    id: toTldrawShapeId(shape.shapeId),
    parentId: null,
    type: shape._type === "frame" ? "frame" : shape._type,
  }));
}

export function applyVisualizationShapes(
  editor: Editor,
  snapshot: VisualizationShapePayload,
): void {
  const partialShapes = snapshot.shapes
    .map(createPreviewShapePartial)
    .filter((shape): shape is TLShapePartial => shape !== null);

  editor.run(() => {
    if (partialShapes.length > 0) {
      editor.createShapes(partialShapes);
    }

    if (snapshot.bindings.length > 0) {
      editor.createBindings(snapshot.bindings.map(toBindingRecord));
    }
  });
}

export function zoomToVisualization(
  editor: Editor,
  shapes: VisualizationShapeDescriptor[],
): void {
  const focusShapeIds = resolveVisualizationFocusShapeIds(shapes);
  const bounds = resolveBoundsFromShapeIds(editor, focusShapeIds);

  if (!bounds) {
    editor.zoomToFit({
      animation: {
        duration: 0,
      },
    });
    return;
  }

  editor.zoomToBounds(bounds, {
    inset: VISUALIZATION_INSET_PX,
    animation: {
      duration: 0,
    },
  });
}
