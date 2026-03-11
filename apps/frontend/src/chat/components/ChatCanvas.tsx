import type {
  AnchorGroupsByMessageKey,
  ConnectorPath,
  MessageRecord,
  MessagesByWindowId,
  Viewport,
  WindowScrollState,
  WindowRecord,
} from "../../types";
import type { ResizeEdges } from "../hooks/useCanvasInteractions";
import {
  getViewportEffectiveScale,
  snapToDevicePixel,
} from "../hooks/canvasUtils";
import ChatWindow from "./ChatWindow";
import ConnectionLayer from "./ConnectionLayer";
import { primaryButtonClassName } from "./ui";

const EMPTY_MESSAGES: MessageRecord[] = [];
const DEFAULT_SCROLL_STATE: WindowScrollState = {
  scrollTop: null,
  shouldAutoScroll: true,
};

interface ChatCanvasProps {
  availableModels: string[];
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  connectorPaths: ConnectorPath[];
  messagesByWindowId: MessagesByWindowId;
  onCanvasPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onComposerChange: (windowId: string, composer: string) => void;
  onGeometryChange: () => void;
  onHeaderPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
  ) => void;
  onModelChange: (windowId: string, model: string) => void;
  onResizePointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ) => void;
  onMessageMouseDown: (
    event: React.MouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onOpenFreshRootWindow: () => void;
  onRetry: (windowId: string, messageId: string) => void | Promise<void>;
  onSend: (windowId: string, promptOverride?: string) => void | Promise<void>;
  onToggleHistoryExpanded: (windowId: string) => void;
  onWindowClose: (windowId: string) => void;
  onWindowFocus: (windowId: string) => void;
  onWindowScrollStateChange: (
    windowId: string,
    nextState: WindowScrollState,
  ) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
  viewport: Viewport;
  windowScrollStates: Record<string, WindowScrollState>;
  windows: WindowRecord[];
}

function ChatCanvas({
  availableModels,
  anchorGroupsByMessageKey,
  canvasRef,
  connectorPaths,
  messagesByWindowId,
  onCanvasPointerDown,
  onComposerChange,
  onGeometryChange,
  onHeaderPointerDown,
  onModelChange,
  onResizePointerDown,
  onMessageMouseDown,
  onOpenFreshRootWindow,
  onRetry,
  onSend,
  onToggleHistoryExpanded,
  onWindowClose,
  onWindowFocus,
  onWindowScrollStateChange,
  registerAnchorRef,
  registerWindowRef,
  viewport,
  windowScrollStates,
  windows,
}: ChatCanvasProps) {
  const effectiveScale = getViewportEffectiveScale(viewport);
  const snappedViewportX = snapToDevicePixel(viewport.x);
  const snappedViewportY = snapToDevicePixel(viewport.y);

  return (
    <div
      className="relative cursor-grab overflow-hidden border-t border-border bg-secondary/60 active:cursor-grabbing"
      ref={canvasRef}
      onPointerDown={onCanvasPointerDown}
    >
      <ConnectionLayer paths={connectorPaths} />

      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${snappedViewportX}px, ${snappedViewportY}px)`,
        }}
      >
        <div
          className="relative min-h-full min-w-full origin-top-left"
          style={{
            zoom: effectiveScale,
          }}
        >
          {windows.map((windowData, index) => (
            <ChatWindow
              key={windowData.id}
              anchorGroupsByMessageKey={anchorGroupsByMessageKey}
              isFocused={index === windows.length - 1}
              messages={messagesByWindowId[windowData.id] ?? EMPTY_MESSAGES}
              onClose={onWindowClose}
              onComposerChange={onComposerChange}
              onGeometryChange={onGeometryChange}
              onHeaderPointerDown={onHeaderPointerDown}
              onModelChange={onModelChange}
              onResizePointerDown={onResizePointerDown}
              onMessageMouseDown={onMessageMouseDown}
              onRetry={onRetry}
              onSend={onSend}
              onToggleHistoryExpanded={onToggleHistoryExpanded}
              onWindowFocus={onWindowFocus}
              onWindowScrollStateChange={onWindowScrollStateChange}
              registerAnchorRef={registerAnchorRef}
              registerWindowRef={registerWindowRef}
              savedScrollState={windowScrollStates[windowData.id] ?? DEFAULT_SCROLL_STATE}
              windowData={windowData}
              availableModels={availableModels}
              zIndex={index + 1}
            />
          ))}
        </div>
      </div>

      <div className="absolute top-6 left-6">
        <button
          className={primaryButtonClassName}
          type="button"
          onClick={onOpenFreshRootWindow}
        >
          New Chat
        </button>
      </div>
    </div>
  );
}

export default ChatCanvas;
