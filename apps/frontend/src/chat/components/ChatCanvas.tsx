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
  const gutterMarks = ["a", "b", "c", "d", "e", "f"];

  return (
    <div className="relative grid h-full min-h-0 grid-cols-1 overflow-hidden bg-background lg:grid-cols-[minmax(420px,44%)_1fr]">
      <div className="pointer-events-none absolute inset-0 z-0">
        <ConnectionLayer paths={connectorPaths} />
      </div>

      <aside className="relative z-10 min-h-0 overflow-hidden border-b border-border bg-paper-sheet lg:border-r lg:border-b-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 24%, var(--paper-grain-light) 0 0.7px, transparent 1px), radial-gradient(circle at 72% 38%, var(--paper-grain-dark) 0 0.75px, transparent 1.05px), radial-gradient(circle at 34% 76%, var(--paper-grain-dark) 0 0.65px, transparent 0.95px), radial-gradient(circle at 84% 68%, var(--paper-grain-light) 0 0.6px, transparent 0.9px), linear-gradient(to bottom, var(--paper-grain-wash), transparent 18%, transparent 82%, var(--paper-grain-shadow))",
            backgroundSize: "18px 18px, 22px 22px, 20px 20px, 16px 16px, 100% 100%",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-10 left-[17px] z-10 flex flex-col justify-between"
        >
          {gutterMarks.map((mark) => (
            <span
              key={mark}
              className="block h-3.5 w-3.5 rounded-full border border-border bg-background"
            />
          ))}
        </div>

        <div className="relative flex h-full min-h-0 flex-col pl-8">
          {mainWindow ? (
            <div className="min-h-0 flex-1 px-6 pb-6 pt-5">
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

      <div className="relative z-10 min-h-0 overflow-hidden border-t border-border bg-paper lg:border-t-0">
        <div className="pointer-events-none absolute bottom-4 right-4 top-4 z-20 hidden w-9 flex-col items-stretch border border-border/70 bg-paper-raised text-[10px] uppercase tracking-[0.18em] text-paper-ink-soft md:flex">
          <span className="flex-1 border-b border-border/50 bg-paper-accent p-2 text-center [writing-mode:vertical-rl]">
            typographic
          </span>
          <span className="flex-1 border-b border-border/50 bg-paper-sheet p-2 text-center [writing-mode:vertical-rl]">
            textured
          </span>
          <span className="flex-1 bg-paper p-2 text-center [writing-mode:vertical-rl]">
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
                "linear-gradient(to right, var(--paper-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--paper-grid) 1px, transparent 1px)",
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
