import type {
  AnchorGroupsByMessageKey,
  ConnectorPath,
  MessagesByWindowId,
  Viewport,
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
  onMessageMouseUp: (
    event: React.MouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onOpenFreshRootWindow: () => void;
  onSend: (windowId: string) => void | Promise<void>;
  onWindowClose: (windowId: string) => void;
  onWindowFocus: (windowId: string) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
  viewport: Viewport;
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
  onMessageMouseUp,
  onOpenFreshRootWindow,
  onSend,
  onWindowClose,
  onWindowFocus,
  registerAnchorRef,
  registerWindowRef,
  viewport,
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
        {windows.map((windowData, index) => (
          <ChatWindow
            key={windowData.id}
            anchorGroupsByMessageKey={anchorGroupsByMessageKey}
            messages={messagesByWindowId[windowData.id] || []}
            onClose={onWindowClose}
            onComposerChange={onComposerChange}
            onGeometryChange={onGeometryChange}
            onHeaderPointerDown={onHeaderPointerDown}
            onResizePointerDown={onResizePointerDown}
            onMessageMouseUp={onMessageMouseUp}
            onSend={onSend}
            onWindowFocus={onWindowFocus}
            registerAnchorRef={registerAnchorRef}
            registerWindowRef={registerWindowRef}
            windowData={windowData}
            zIndex={index + 1}
          />
        ))}
      </div>

      {windows.length === 0 ? (
        <div className="absolute bottom-6 left-6 w-[min(440px,calc(100%-3rem))] border border-zinc-300 bg-white p-6 shadow-[8px_8px_0_0_rgba(24,24,27,0.08)]">
          <div>
            <p className={eyebrowClassName}>Board is empty</p>
            <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-950">
              Open a fresh main chat to start branching again.
            </h2>
          </div>
          <button
            className={`${primaryButtonClassName} mt-5`}
            type="button"
            onClick={onOpenFreshRootWindow}
          >
            Open main chat
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ChatCanvas;
