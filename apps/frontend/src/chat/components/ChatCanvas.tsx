import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
import { PANE_SEPARATOR_WIDTH } from "../lib/constants";
import {
  getViewportEffectiveScale,
  snapToDevicePixel,
} from "../hooks/canvasUtils";
import ChatWindow from "./ChatWindow";
import ConnectionLayer from "./ConnectionLayer";
import WorkspaceGridCanvas from "./WorkspaceGridCanvas";

const EMPTY_MESSAGES: MessageRecord[] = [];
const DEFAULT_SCROLL_STATE: WindowScrollState = {
  scrollTop: null,
  shouldAutoScroll: true,
};
const FLOATING_WINDOW_EXIT_DURATION_MS = 220;
const NOTEBOOK_GUTTER_WIDTH_PX = 68;
const NOTEBOOK_BINDER_MARKS = [
  "circle",
  "capsule",
  "capsule",
  "circle",
  "capsule",
  "capsule",
  "circle",
] as const;

interface FloatingWindowPresenceEntry {
  enterKind: "branch" | "newNote";
  isExiting: boolean;
  messages: MessageRecord[];
  savedScrollState: WindowScrollState;
  windowData: WindowRecord;
  zIndex: number;
}

interface ChatCanvasProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  connectorPaths: ConnectorPath[];
  isPaneResizing: boolean;
  leftPaneWidthPx: number | null;
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
  onOpenFreshRootWindow: () => void;
  onPaneResizePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
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
  splitPaneRef: React.RefObject<HTMLDivElement | null>;
  viewport: Viewport;
  windowScrollStates: Record<string, WindowScrollState>;
  windows: WindowRecord[];
}

function ChatCanvas({
  anchorGroupsByMessageKey,
  canvasRef,
  connectorPaths,
  isPaneResizing,
  leftPaneWidthPx,
  mainWindow,
  messagesByWindowId,
  onCanvasPointerDown,
  onComposerChange,
  onGeometryChange,
  onHeaderPointerDown,
  onModelChange,
  onOpenFreshRootWindow,
  onPaneResizePointerDown,
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
  splitPaneRef,
  viewport,
  windowScrollStates,
  windows,
}: ChatCanvasProps) {
  const effectiveScale = getViewportEffectiveScale(viewport);
  const snappedViewportX = snapToDevicePixel(viewport.x);
  const snappedViewportY = snapToDevicePixel(viewport.y);
  const splitPaneStyle = {
    "--chat-split-columns": leftPaneWidthPx
      ? `${leftPaneWidthPx}px ${PANE_SEPARATOR_WIDTH}px minmax(0, 1fr)`
      : `minmax(420px, 44%) ${PANE_SEPARATOR_WIDTH}px minmax(0, 1fr)`,
  } as CSSProperties;
  const exitTimeoutsRef = useRef<Record<string, number>>({});
  const [floatingWindowEntries, setFloatingWindowEntries] = useState<
    FloatingWindowPresenceEntry[]
  >(() =>
    windows.map((windowData, index) => ({
      enterKind: windowData.parentId === null ? "newNote" : "branch",
      isExiting: false,
      messages: messagesByWindowId[windowData.id] ?? EMPTY_MESSAGES,
      savedScrollState:
        windowScrollStates[windowData.id] ?? DEFAULT_SCROLL_STATE,
      windowData,
      zIndex: index + 1,
    })),
  );

  useEffect(() => {
    setFloatingWindowEntries((current) => {
      const currentById = new Map(
        current.map((entry) => [entry.windowData.id, entry] as const),
      );
      const nextIds = new Set(windows.map((windowData) => windowData.id));
      const nextEntries: FloatingWindowPresenceEntry[] = windows.map((windowData, index) => {
        const existing = currentById.get(windowData.id);

        return {
          enterKind:
            existing?.enterKind ??
            (windowData.parentId === null ? "newNote" : "branch"),
          isExiting: false,
          messages: messagesByWindowId[windowData.id] ?? existing?.messages ?? EMPTY_MESSAGES,
          savedScrollState:
            windowScrollStates[windowData.id] ??
            existing?.savedScrollState ??
            DEFAULT_SCROLL_STATE,
          windowData,
          zIndex: index + 1,
        };
      });

      current.forEach((entry) => {
        if (!nextIds.has(entry.windowData.id)) {
          nextEntries.push({
            ...entry,
            isExiting: true,
          });
        }
      });

      return nextEntries;
    });
  }, [windows, messagesByWindowId, windowScrollStates]);

  useEffect(() => {
    floatingWindowEntries.forEach((entry) => {
      const windowId = entry.windowData.id;

      if (entry.isExiting) {
        if (exitTimeoutsRef.current[windowId]) {
          return;
        }

        exitTimeoutsRef.current[windowId] = window.setTimeout(() => {
          setFloatingWindowEntries((current) =>
            current.filter((candidate) => candidate.windowData.id !== windowId),
          );
          delete exitTimeoutsRef.current[windowId];
        }, FLOATING_WINDOW_EXIT_DURATION_MS);
        return;
      }

      const activeTimeout = exitTimeoutsRef.current[windowId];
      if (activeTimeout) {
        window.clearTimeout(activeTimeout);
        delete exitTimeoutsRef.current[windowId];
      }
    });
  }, [floatingWindowEntries]);

  useEffect(() => {
    return () => {
      Object.values(exitTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      exitTimeoutsRef.current = {};
    };
  }, []);

  return (
    <div
      className="relative grid h-full min-h-0 grid-cols-1 overflow-hidden bg-background lg:[grid-template-columns:var(--chat-split-columns)]"
      ref={splitPaneRef}
      style={splitPaneStyle}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <ConnectionLayer paths={connectorPaths} />
      </div>

      <aside className="notebook-pane group/notebook relative z-10 min-h-0 min-w-0 overflow-hidden border-b border-border bg-paper-sheet lg:border-b-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 24%, var(--paper-grain-light) 0 0.7px, transparent 1px), radial-gradient(circle at 72% 38%, var(--paper-grain-dark) 0 0.75px, transparent 1.05px), radial-gradient(circle at 34% 76%, var(--paper-grain-dark) 0 0.65px, transparent 0.95px), radial-gradient(circle at 84% 68%, var(--paper-grain-light) 0 0.6px, transparent 0.9px), linear-gradient(to bottom, var(--paper-grain-wash), transparent 18%, transparent 82%, var(--paper-grain-shadow))",
            backgroundSize: "18px 18px, 22px 22px, 20px 20px, 16px 16px, 100% 100%",
          }}
        />

        <div className="relative flex h-full min-h-0 min-w-0 flex-col px-4">
          {mainWindow ? (
            <div className="min-h-0 min-w-0 flex-1 py-4">
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

      <div
        aria-hidden
        className="relative z-20 hidden h-full touch-none cursor-col-resize lg:block"
        onPointerDown={onPaneResizePointerDown}
      >
        <div
          className={[
            "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-200",
            isPaneResizing ? "bg-foreground/35" : "bg-border/90",
          ].join(" ")}
        />
        <div
          className={[
            "absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 rounded-full transition-colors duration-200",
            isPaneResizing ? "bg-paper-raised/80" : "hover:bg-paper-raised/55",
          ].join(" ")}
        />
      </div>

      <div className="relative z-10 min-h-0 overflow-hidden bg-paper-raised/45">
        <div
          className="relative h-full overflow-hidden bg-paper-sheet"
          style={{
            backgroundImage:
              "radial-gradient(circle at 16% 20%, var(--paper-grain-light) 0 0.8px, transparent 1.15px), radial-gradient(circle at 76% 32%, var(--paper-grain-dark) 0 0.75px, transparent 1.05px), radial-gradient(circle at 38% 78%, var(--paper-grain-dark) 0 0.65px, transparent 0.95px), radial-gradient(circle at 86% 66%, var(--paper-grain-light) 0 0.7px, transparent 0.98px), linear-gradient(to bottom, var(--paper-grain-wash), transparent 14%, transparent 86%, var(--paper-grain-shadow))",
            backgroundSize: "18px 18px, 24px 24px, 20px 20px, 16px 16px, 100% 100%",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-20 flex flex-col justify-between py-8"
            style={{ width: `${NOTEBOOK_GUTTER_WIDTH_PX}px` }}
          >
            {NOTEBOOK_BINDER_MARKS.map((mark, index) => (
                <span
                  key={`${mark}-${index}`}
                  className={[
                  "mx-auto block bg-paper-gutter shadow-[inset_0_1px_0_rgb(255_255_255_/_0.34)]",
                  mark === "circle"
                    ? "h-4 w-4 rounded-full"
                    : "h-8 w-4 rounded-full",
                ].join(" ")}
              />
            ))}
          </div>

          <button
            aria-label="Add new note"
            className="absolute left-1/2 top-4 z-30 -translate-x-1/2 cursor-pointer transition-transform duration-200 hover:-translate-x-1/2 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            type="button"
            onClick={onOpenFreshRootWindow}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <img alt="" className="h-9 w-auto select-none" draggable={false} src="/new-note.png" />
          </button>

          <div
            className="absolute overflow-hidden border-b border-r border-paper-stroke/30"
            ref={canvasRef}
            style={{
              top: "1rem",
              right: "2rem",
              bottom: "1rem",
              left: `${NOTEBOOK_GUTTER_WIDTH_PX}px`,
              "--paper": "var(--paper-sheet)",
            } as CSSProperties}
            onPointerDown={onCanvasPointerDown}
          >
            <WorkspaceGridCanvas hostRef={canvasRef} viewport={viewport} />

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
                {floatingWindowEntries.map((entry, index) => (
                  <motion.div
                    key={entry.windowData.id}
                    animate={
                      entry.isExiting
                        ? { opacity: 0, x: 24, y: 16, scale: 0.985 }
                        : { opacity: 1, scale: 1, x: 0, y: 0 }
                    }
                    initial={
                      entry.enterKind === "newNote"
                        ? { opacity: 0, y: -28 }
                        : { opacity: 0, scale: 0.96, y: 10 }
                    }
                    transition={{
                      duration: FLOATING_WINDOW_EXIT_DURATION_MS / 1000,
                      ease: "easeOut",
                    }}
                  >
                    <ChatWindow
                      anchorGroupsByMessageKey={anchorGroupsByMessageKey}
                      isFocused={!entry.isExiting && index === windows.length - 1}
                      messages={entry.messages}
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
                      savedScrollState={entry.savedScrollState}
                      windowData={entry.windowData}
                      zIndex={entry.zIndex}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatCanvas;
