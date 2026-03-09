export interface ResizeEdges {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

export type CanvasInteraction =
  | {
      type: "pan";
      startClientX: number;
      startClientY: number;
      startViewportX: number;
      startViewportY: number;
    }
  | {
      type: "drag";
      windowId: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      scale: number;
    }
  | {
      type: "resize";
      windowId: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      startWidth: number;
      startHeight: number;
      scale: number;
      edges: ResizeEdges;
    };
