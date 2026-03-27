import { describe, expect, it, vi } from "vitest";

import {
  applyVisualizationShapes,
  getVisualizationShapeDescriptors,
  resolveVisualizationFocusShapeIds,
  zoomToVisualization,
} from "./tldrawSnapshot";

describe("applyVisualizationShapes", () => {
  it("creates shapes before bindings", () => {
    const callOrder: string[] = [];
    const editor = {
      run: (fn: () => void) => fn(),
      createShapes: vi.fn((shapes: unknown[]) => {
        callOrder.push("shapes");
        expect(shapes).toHaveLength(2);
        expect((shapes as Array<{ id: string }>)[0]?.id).toBe("shape:box:1");
        expect((shapes as Array<{ id: string }>)[1]?.id).toBe("shape:arrow:1");
      }),
      createBindings: vi.fn((bindings: unknown[]) => {
        callOrder.push("bindings");
        expect(bindings).toEqual([
          {
            type: "arrow",
            fromId: "shape:box:1",
            toId: "shape:box:2",
            props: {},
          },
        ]);
      }),
    };

    applyVisualizationShapes(editor as never, {
      shapes: [
        { _type: "rectangle", shapeId: "box:1", x: 0, y: 0, w: 240, h: 120, text: "Box" },
        { _type: "arrow", shapeId: "arrow:1", x1: 0, y1: 0, x2: 100, y2: 0 },
      ],
      bindings: [
        {
          type: "arrow",
          fromId: "box:1",
          toId: "box:2",
          props: {},
        } as never,
      ],
    });

    expect(callOrder).toEqual(["shapes", "bindings"]);
  });

  it("positions anchored text relative to its anchor point", () => {
    const createShapes = vi.fn();
    const editor = {
      run: (fn: () => void) => fn(),
      createShapes,
      createBindings: vi.fn(),
    };

    applyVisualizationShapes(editor as never, {
      shapes: [
        {
          _type: "text",
          shapeId: "title",
          x: 400,
          y: 100,
          text: "Anchored title",
          anchor: "top-center",
          maxWidth: 200,
        },
      ],
      bindings: [],
    });

    expect(createShapes).toHaveBeenCalledTimes(1);
    const [shape] = createShapes.mock.calls[0][0] as Array<{
      x: number;
      y: number;
      props: { w: number };
    }>;
    expect(shape.props.w).toBe(200);
    expect(shape.x).toBeLessThan(400);
    expect(shape.y).toBe(100);
  });

  it("maps normalized geo fills to valid tldraw fill styles", () => {
    const createShapes = vi.fn();
    const editor = {
      run: (fn: () => void) => fn(),
      createShapes,
      createBindings: vi.fn(),
    };

    applyVisualizationShapes(editor as never, {
      shapes: [
        { _type: "rectangle", shapeId: "shape-none", fill: "none" },
        { _type: "rectangle", shapeId: "shape-tint", fill: "tint" },
        { _type: "rectangle", shapeId: "shape-background", fill: "background" },
        { _type: "rectangle", shapeId: "shape-solid", fill: "solid" },
        { _type: "rectangle", shapeId: "shape-pattern", fill: "pattern" },
      ],
      bindings: [],
    });

    expect(createShapes).toHaveBeenCalledTimes(1);
    expect(
      (createShapes.mock.calls[0]?.[0] as Array<{ props: { fill: string } }>).map(
        (shape) => shape.props.fill,
      ),
    ).toEqual(["none", "solid", "semi", "fill", "pattern"]);
  });
});

describe("getVisualizationShapeDescriptors", () => {
  it("maps preview shapes into focus descriptors", () => {
    expect(
      getVisualizationShapeDescriptors({
        shapes: [{ _type: "rectangle", shapeId: "box:1" }],
        bindings: [],
      }),
    ).toEqual([
      {
        id: "shape:box:1",
        parentId: null,
        type: "rectangle",
      },
    ]);
  });
});

describe("resolveVisualizationFocusShapeIds", () => {
  it("prefers the descendants of a single wrapper frame", () => {
    expect(
      resolveVisualizationFocusShapeIds([
        {
          id: "frame:1",
          parentId: "page:page",
          type: "frame",
        },
        {
          id: "shape:1",
          parentId: "frame:1",
          type: "geo",
        },
        {
          id: "shape:2",
          parentId: "frame:1",
          type: "text",
        },
      ]),
    ).toEqual(["shape:1", "shape:2"]);
  });

  it("falls back to all non-frame shapes when there is no wrapper frame", () => {
    expect(
      resolveVisualizationFocusShapeIds([
        {
          id: "shape:1",
          parentId: "page:page",
          type: "geo",
        },
        {
          id: "shape:2",
          parentId: "page:page",
          type: "text",
        },
      ]),
    ).toEqual(["shape:1", "shape:2"]);
  });
});

describe("zoomToVisualization", () => {
  it("zooms to the preferred content bounds with a tighter inset", () => {
    const zoomToBounds = vi.fn();
    const zoomToFit = vi.fn();
    const editor = {
      getShapePageBounds: vi.fn((shapeId: string) => {
        if (shapeId === "shape:1") {
          return { x: 20, y: 30, w: 200, h: 100 };
        }

        return { x: 260, y: 30, w: 180, h: 120 };
      }),
      zoomToBounds,
      zoomToFit,
    };

    zoomToVisualization(editor as never, [
      {
        id: "frame:1",
        parentId: "page:page",
        type: "frame",
      },
      {
        id: "shape:1",
        parentId: "frame:1",
        type: "geo",
      },
      {
        id: "shape:2",
        parentId: "frame:1",
        type: "text",
      },
    ]);

    expect(zoomToBounds).toHaveBeenCalledWith(
      {
        x: 20,
        y: 30,
        w: 420,
        h: 120,
      },
      {
        inset: 24,
        animation: {
          duration: 0,
        },
      },
    );
    expect(zoomToFit).not.toHaveBeenCalled();
  });
});
