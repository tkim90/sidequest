export interface SelectionState {
  parentWindowId: string;
  parentMessageId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  x: number;
  y: number;
  windowLocalY: number;
}

export interface ClosePrompt {
  windowId: string;
  descendantIds: string[];
  descendantTitles: string[];
}

export interface ConnectorPath {
  id: string;
  path: string;
}

export type InteractionState =
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
      edges: {
        north: boolean;
        south: boolean;
        east: boolean;
        west: boolean;
      };
    };
