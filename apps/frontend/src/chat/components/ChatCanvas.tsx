import type {
  AnchorGroupsByMessageKey,
  ConnectorPath,
  MessagesByWindowId,
  Viewport,
  WindowScrollState,
  WindowRecord,
} from "../../types";
import type { ResizeEdges } from "../hooks/useCanvasInteractions";
import ChatWindow from "./ChatWindow";
import ConnectionLayer from "./ConnectionLayer";
import { eyebrowClassName, primaryButtonClassName } from "./ui";

interface ChatCanvasProps {
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
  onSend: (windowId: string) => void | Promise<void>;
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
  anchorGroupsByMessageKey,
  canvasRef,
  connectorPaths,
  messagesByWindowId,
  onCanvasPointerDown,
  onComposerChange,
  onGeometryChange,
  onHeaderPointerDown,
  onResizePointerDown,
  onMessageMouseDown,
  onOpenFreshRootWindow,
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
  return (
    <div
      className="relative overflow-hidden border-t border-zinc-300 bg-zinc-50 cursor-grab active:cursor-grabbing"
      ref={canvasRef}
      onPointerDown={onCanvasPointerDown}
    >
      <ConnectionLayer paths={connectorPaths} />

      <div
        className="absolute inset-0 origin-top-left will-change-transform"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
        }}
      >
        <div
          className="relative min-h-full min-w-full origin-top-left"
          style={{
            zoom: viewport.zoom,
          }}
        >
          {windows.map((windowData, index) => (
            <ChatWindow
              key={windowData.id}
              anchorGroupsByMessageKey={anchorGroupsByMessageKey}
              isFocused={index === windows.length - 1}
              messages={messagesByWindowId[windowData.id] || []}
              onClose={onWindowClose}
              onComposerChange={onComposerChange}
              onGeometryChange={onGeometryChange}
              onHeaderPointerDown={onHeaderPointerDown}
              onResizePointerDown={onResizePointerDown}
              onMessageMouseDown={onMessageMouseDown}
              onSend={onSend}
              onToggleHistoryExpanded={onToggleHistoryExpanded}
              onWindowFocus={onWindowFocus}
              onWindowScrollStateChange={onWindowScrollStateChange}
              registerAnchorRef={registerAnchorRef}
              registerWindowRef={registerWindowRef}
              savedScrollState={
                windowScrollStates[windowData.id] || {
                  scrollTop: null,
                  shouldAutoScroll: true,
                }
              }
              windowData={windowData}
              zIndex={index + 1}
            />
          ))}
        </div>
      </div>

      {windows.length === 0 ? (
        <div className="absolute bottom-6 left-6 w-[min(440px,calc(100%-3rem))]">
          <button
            className={`${primaryButtonClassName} mt-5`}
            type="button"
            onClick={onOpenFreshRootWindow}
          >
            New Chat
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ChatCanvas;
