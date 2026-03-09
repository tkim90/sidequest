import type {
  AnchorGroupsByMessageKey,
  ConnectorPath,
  MessagesByWindowId,
  Viewport,
  WindowRecord,
} from "../../types";
import ChatWindow from "./ChatWindow";
import ConnectionLayer from "./ConnectionLayer";

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
      className="canvas"
      ref={canvasRef}
      onPointerDown={onCanvasPointerDown}
    >
      <ConnectionLayer paths={connectorPaths} />

      <div
        className="canvas-scene"
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
        <div className="empty-board">
          <div>
            <p className="workspace-header__eyebrow">Board is empty</p>
            <h2>Open a fresh main chat to start branching again.</h2>
          </div>
          <button
            className="send-button"
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
