import { motion } from "motion/react";

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

const EMPTY_MESSAGES: MessageRecord[] = [];
const DEFAULT_SCROLL_STATE: WindowScrollState = {
  scrollTop: null,
  shouldAutoScroll: true,
};

interface ChatCanvasProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  connectorPaths: ConnectorPath[];
  mainWindow: WindowRecord | null;
  messagesByWindowId: MessagesByWindowId;
  onCanvasPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onComposerChange: (windowId: string, composer: string) => void;
  onGeometryChange: () => void;
  onHeaderPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
  ) => void;
  onModelChange: (windowId: string, model: string) => void;
  onEffortChange: (
    windowId: string,
    effort: WindowRecord["selectedEffort"],
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
  anchorGroupsByMessageKey,
  canvasRef,
  connectorPaths,
  mainWindow,
  messagesByWindowId,
  onCanvasPointerDown,
  onComposerChange,
  onGeometryChange,
  onHeaderPointerDown,
  onModelChange,
  onEffortChange,
  onResizePointerDown,
  onMessageMouseDown,
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
    <div className="relative grid h-full min-h-0 grid-cols-1 overflow-hidden bg-card lg:grid-cols-[minmax(420px,44%)_1fr]">
      <div className="pointer-events-none absolute inset-0 z-0">
        <ConnectionLayer paths={connectorPaths} />
      </div>

      <aside className="relative z-10 min-h-0 border-b border-border bg-[#f8f3ea] lg:border-r lg:border-b-0">
        <div className="flex h-full min-h-0 flex-col">
          {mainWindow ? (
            <div className="min-h-0 flex-1 p-4">
              <ChatWindow
                anchorGroupsByMessageKey={anchorGroupsByMessageKey}
                isFixedPane
                isFocused
                messages={messagesByWindowId[mainWindow.id] ?? EMPTY_MESSAGES}
                onClose={onWindowClose}
                onComposerChange={onComposerChange}
                onEffortChange={onEffortChange}
                onGeometryChange={onGeometryChange}
                onHeaderPointerDown={onHeaderPointerDown}
                onMessageMouseDown={onMessageMouseDown}
                onModelChange={onModelChange}
                onResizePointerDown={onResizePointerDown}
                onRetry={onRetry}
                onSend={onSend}
                onToggleHistoryExpanded={onToggleHistoryExpanded}
                onWindowFocus={onWindowFocus}
                onWindowScrollStateChange={onWindowScrollStateChange}
                registerAnchorRef={registerAnchorRef}
                registerWindowRef={registerWindowRef}
                savedScrollState={
                  windowScrollStates[mainWindow.id] ?? DEFAULT_SCROLL_STATE
                }
                windowData={mainWindow}
                zIndex={100}
              />
            </div>
          ) : null}
        </div>
      </aside>

      <div className="relative z-10 min-h-0 overflow-hidden border-t border-border bg-[#F4F4F4] lg:border-t-0">
        <div className="pointer-events-none absolute inset-x-5 top-4 z-20 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[#8e8e8e]">
          <p>Canvas · organize · shuffle</p>
          <p>{windows.length} floating windows</p>
        </div>

        <div className="pointer-events-none absolute bottom-4 right-4 top-4 z-20 hidden w-9 flex-col items-stretch border border-border/70 bg-[#eee8df] text-[10px] uppercase tracking-[0.18em] text-[#9d845a] md:flex">
          <span className="flex-1 border-b border-border/50 bg-[#f1d9b4] p-2 text-center [writing-mode:vertical-rl]">
            typographic
          </span>
          <span className="flex-1 border-b border-border/50 p-2 text-center text-[#b2b2b2] [writing-mode:vertical-rl]">
            textured
          </span>
          <span className="flex-1 p-2 text-center text-[#91a88b] [writing-mode:vertical-rl]">
            monoline
          </span>
        </div>

        <div
          className="relative h-full cursor-grab overflow-hidden active:cursor-grabbing"
          ref={canvasRef}
          onPointerDown={onCanvasPointerDown}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(108,108,108,0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(108,108,108,0.09) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

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
                <motion.div
                  key={windowData.id}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <ChatWindow
                    anchorGroupsByMessageKey={anchorGroupsByMessageKey}
                    isFocused={index === windows.length - 1}
                    messages={messagesByWindowId[windowData.id] ?? EMPTY_MESSAGES}
                    onClose={onWindowClose}
                    onComposerChange={onComposerChange}
                    onEffortChange={onEffortChange}
                    onGeometryChange={onGeometryChange}
                    onHeaderPointerDown={onHeaderPointerDown}
                    onMessageMouseDown={onMessageMouseDown}
                    onModelChange={onModelChange}
                    onResizePointerDown={onResizePointerDown}
                    onRetry={onRetry}
                    onSend={onSend}
                    onToggleHistoryExpanded={onToggleHistoryExpanded}
                    onWindowFocus={onWindowFocus}
                    onWindowScrollStateChange={onWindowScrollStateChange}
                    registerAnchorRef={registerAnchorRef}
                    registerWindowRef={registerWindowRef}
                    savedScrollState={
                      windowScrollStates[windowData.id] ?? DEFAULT_SCROLL_STATE
                    }
                    windowData={windowData}
                    zIndex={index + 1}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatCanvas;
