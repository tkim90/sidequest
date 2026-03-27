import { memo, type PointerEvent as ReactPointerEvent } from "react";

import type {
  VisualizationRecord,
  WindowRecord,
} from "../../../types";
import { snapToDevicePixel } from "../../hooks/canvasUtils";
import type { ResizeEdges } from "../../hooks/canvasTypes";
import TldrawVisualizationCanvas from "./TldrawVisualizationCanvas";
import ChatWindowHeader from "./ChatWindowHeader";
import ChatWindowResizeHandles from "./ChatWindowResizeHandles";

interface VisualizationWindowProps {
  alwaysShowCloseButton?: boolean;
  isFixedPane?: boolean;
  isFocused: boolean;
  mobileInteractionMode?: "scroll" | "scroll-first-swipe";
  onClose: (windowId: string) => void;
  onHeaderPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
  ) => void;
  onMobileBodyPointerDown?: React.ComponentProps<"div">["onPointerDown"];
  onMobileHeaderPointerDown?: React.ComponentProps<"header">["onPointerDown"];
  onNavigateToBranchSource: (
    windowId: string,
    branchAnchorId: string | null,
  ) => void;
  onResizePointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ) => void;
  onWindowFocus: (windowId: string) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
  showFixedPaneCloseButton?: boolean;
  visualization: VisualizationRecord | null;
  windowData: WindowRecord;
  zIndex: number;
}

function VisualizationWindow({
  alwaysShowCloseButton = false,
  isFixedPane = false,
  isFocused,
  mobileInteractionMode,
  onClose,
  onHeaderPointerDown,
  onMobileBodyPointerDown,
  onMobileHeaderPointerDown,
  onNavigateToBranchSource,
  onResizePointerDown,
  onWindowFocus,
  registerWindowRef,
  showFixedPaneCloseButton = false,
  visualization,
  windowData,
  zIndex,
}: VisualizationWindowProps) {
  const snappedWindowX = snapToDevicePixel(windowData.x);
  const snappedWindowY = snapToDevicePixel(windowData.y);
  const dynamicStyle = isFixedPane
    ? undefined
    : {
        transform: `translate3d(${snappedWindowX}px, ${snappedWindowY}px, 0)`,
        width: windowData.width,
        height: windowData.height,
        zIndex,
      };

  function handleWindowPointerDown(event: ReactPointerEvent<HTMLElement>): void {
    if (isFixedPane) {
      return;
    }

    onWindowFocus(windowData.id);
    const target = event.target as HTMLElement;
    if (target.closest("button, [data-visualization-canvas]")) {
      return;
    }

    onHeaderPointerDown(event, windowData.id);
  }

  return (
    <article
      className={[
        "grid grid-rows-[auto_1fr]",
        isFixedPane
          ? "relative h-full w-full min-w-0 overflow-hidden bg-transparent shadow-none"
          : "group/chat-window absolute origin-top-left min-w-0 cursor-grab overflow-hidden rounded-[26px] bg-paper-window shadow-[var(--paper-window-shadow)] will-change-transform active:cursor-grabbing",
      ].join(" ")}
      data-chat-window
      data-window-focused={isFocused ? "true" : undefined}
      data-visualization-window="true"
      ref={(node) => registerWindowRef(windowData.id, node)}
      style={dynamicStyle}
      onPointerDown={handleWindowPointerDown}
    >
      {isFixedPane ? null : (
        <div
          aria-hidden
          className="paper-texture-window pointer-events-none absolute inset-0 z-0"
        />
      )}

      {isFixedPane ? null : (
        <ChatWindowResizeHandles
          onResizePointerDown={(event, edges) =>
            onResizePointerDown(event, windowData.id, edges)
          }
        />
      )}

      <ChatWindowHeader
        alwaysShowCloseButton={alwaysShowCloseButton}
        branchAnchorId={windowData.branchAnchorId}
        branchFocus={windowData.branchFocus}
        isFixedPane={isFixedPane}
        onMobileDragPointerDown={onMobileHeaderPointerDown}
        onNavigateToBranchSource={() =>
          onNavigateToBranchSource(windowData.id, windowData.branchAnchorId)
        }
        onClose={() => onClose(windowData.id)}
        showCloseButton={isFixedPane ? showFixedPaneCloseButton : true}
        title={windowData.title}
      />

      <div
        className="relative z-10 min-h-0 min-w-0 border-t border-paper-stroke/25"
        data-mobile-drag-surface={
          mobileInteractionMode === "scroll-first-swipe" ? "true" : undefined
        }
        data-mobile-scroll-surface={mobileInteractionMode ? "true" : undefined}
        onPointerDown={onMobileBodyPointerDown}
        style={mobileInteractionMode ? { touchAction: "pan-y" } : undefined}
      >
        {visualization?.status === "ready" ? (
          <TldrawVisualizationCanvas visualization={visualization} />
        ) : (
          <VisualizationPlaceholder visualization={visualization} />
        )}
      </div>
    </article>
  );
}

function VisualizationPlaceholder({
  visualization,
}: {
  visualization: VisualizationRecord | null;
}) {
  const isError = visualization?.status === "error";

  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-3 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_rgba(243,234,218,0.78)_48%,_rgba(238,228,213,0.92))] px-6 py-8 text-center">
      <div className="space-y-1">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {isError ? "Visualization failed" : "Planning diagram"}
        </p>
        <h3 className="m-0 font-serif text-2xl tracking-tight text-foreground">
          {visualization?.title || "Canvas"}
        </h3>
      </div>
      <p className="m-0 text-sm leading-6 text-muted-foreground">
        {isError
          ? visualization?.errorMessage || "The canvas could not be rendered."
          : visualization?.prompt || "Preparing a diagram from the selected text."}
      </p>
    </div>
  );
}

export default memo(VisualizationWindow);
