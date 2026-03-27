import { motion } from "motion/react";

import type { AnchorGroupsByMessageKey, WindowRecord, WindowScrollState } from "../../../types";
import type { ResizeEdges } from "../../hooks/canvasTypes";
import type { FloatingWindowPresenceEntry } from "../../hooks/useFloatingWindowPresence";
import { FLOATING_WINDOW_EXIT_DURATION_MS } from "../../hooks/useFloatingWindowPresence";
import WorkspaceWindow from "../window/WorkspaceWindow";

interface FloatingNoteStackProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  entries: FloatingWindowPresenceEntry[];
  liveWindowCount: number;
  onClose: (windowId: string) => void;
  onComposerChange: (windowId: string, composer: string) => void;
  onEffortChange: (
    windowId: string,
    effort: WindowRecord["selectedEffort"],
  ) => void;
  onGeometryChange: () => void;
  onHeaderPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
  ) => void;
  onMessageMouseDown: (
    event: React.PointerEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onModelChange: (windowId: string, model: string) => void;
  onNavigateToBranchSource: (
    windowId: string,
    branchAnchorId: string | null,
  ) => void;
  onResizePointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ) => void;
  onRetry: (windowId: string, messageId: string) => void | Promise<void>;
  onSend: (windowId: string, promptOverride?: string) => void | Promise<void>;
  onToggleHistoryExpanded: (windowId: string) => void;
  onWindowFocus: (windowId: string) => void;
  onWindowScrollStateChange: (
    windowId: string,
    nextState: WindowScrollState,
  ) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
}

function FloatingNoteStack({
  anchorGroupsByMessageKey,
  entries,
  liveWindowCount,
  onClose,
  onComposerChange,
  onEffortChange,
  onGeometryChange,
  onHeaderPointerDown,
  onMessageMouseDown,
  onModelChange,
  onNavigateToBranchSource,
  onResizePointerDown,
  onRetry,
  onSend,
  onToggleHistoryExpanded,
  onWindowFocus,
  onWindowScrollStateChange,
  registerAnchorRef,
  registerWindowRef,
}: FloatingNoteStackProps) {
  return (
    <>
      {entries.map((entry, index) => (
        <motion.div
          key={entry.windowData.id}
          animate={
            entry.isExiting
              ? { opacity: 0 }
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
          <WorkspaceWindow
            anchorGroupsByMessageKey={anchorGroupsByMessageKey}
            entry={entry}
            isFocused={!entry.isExiting && index === liveWindowCount - 1}
            onClose={onClose}
            onComposerChange={onComposerChange}
            onEffortChange={onEffortChange}
            onGeometryChange={onGeometryChange}
            onHeaderPointerDown={onHeaderPointerDown}
            onMessageMouseDown={onMessageMouseDown}
            onNavigateToBranchSource={onNavigateToBranchSource}
            onModelChange={onModelChange}
            onResizePointerDown={onResizePointerDown}
            onRetry={onRetry}
            onSend={onSend}
            onToggleHistoryExpanded={onToggleHistoryExpanded}
            onWindowFocus={onWindowFocus}
            onWindowScrollStateChange={onWindowScrollStateChange}
            registerAnchorRef={registerAnchorRef}
            registerWindowRef={registerWindowRef}
          />
        </motion.div>
      ))}
    </>
  );
}

export default FloatingNoteStack;
