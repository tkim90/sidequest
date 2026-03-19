export interface ResizeEdges {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

export interface PointerSample {
  clientX: number;
  clientY: number;
  timeMs: number;
}

export interface InertiaState {
  lastTimeMs: number;
  vx: number;
  vy: number;
  windowId: string;
}

export type CanvasInteraction =
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
