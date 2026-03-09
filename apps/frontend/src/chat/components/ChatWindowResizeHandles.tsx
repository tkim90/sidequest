import type { PointerEvent as ReactPointerEvent } from "react";

import type { ResizeEdges } from "../hooks/canvasTypes";

const resizeHandles: Array<{
  key: string;
  className: string;
  edges: ResizeEdges;
}> = [
  {
    key: "top",
    className: "absolute inset-x-3 top-0 z-20 h-2 cursor-n-resize",
    edges: { north: true, south: false, east: false, west: false },
  },
  {
    key: "right",
    className: "absolute inset-y-3 right-0 z-20 w-2 cursor-e-resize",
    edges: { north: false, south: false, east: true, west: false },
  },
  {
    key: "bottom",
    className: "absolute inset-x-3 bottom-0 z-20 h-2 cursor-s-resize",
    edges: { north: false, south: true, east: false, west: false },
  },
  {
    key: "left",
    className: "absolute inset-y-3 left-0 z-20 w-2 cursor-w-resize",
    edges: { north: false, south: false, east: false, west: true },
  },
  {
    key: "top-left",
    className:
      "absolute -left-2 -top-2 z-30 h-6 w-6 cursor-nwse-resize",
    edges: { north: true, south: false, east: false, west: true },
  },
  {
    key: "top-right",
    className:
      "absolute -right-2 -top-2 z-30 h-6 w-6 cursor-nesw-resize",
    edges: { north: true, south: false, east: true, west: false },
  },
  {
    key: "bottom-right",
    className:
      "absolute -bottom-2 -right-2 z-30 h-6 w-6 cursor-nwse-resize",
    edges: { north: false, south: true, east: true, west: false },
  },
  {
    key: "bottom-left",
    className:
      "absolute -bottom-2 -left-2 z-30 h-6 w-6 cursor-nesw-resize",
    edges: { north: false, south: true, east: false, west: true },
  },
];

interface ChatWindowResizeHandlesProps {
  onResizePointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    edges: ResizeEdges,
  ) => void;
}

function ChatWindowResizeHandles({
  onResizePointerDown,
}: ChatWindowResizeHandlesProps) {
  return (
    <>
      {resizeHandles.map((handle) => (
        <span
          key={handle.key}
          aria-hidden="true"
          className={handle.className}
          onPointerDown={(event) => onResizePointerDown(event, handle.edges)}
        />
      ))}
    </>
  );
}

export default ChatWindowResizeHandles;
