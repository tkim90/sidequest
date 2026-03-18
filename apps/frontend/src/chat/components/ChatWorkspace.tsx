import { motion } from "motion/react";

import { useNoticeStore } from "../../stores/noticeStore";
import { useChatWorkspace } from "../hooks/useChatWorkspace";
import ChatCanvas from "./ChatCanvas";
import CloseTreeModal from "./CloseTreeModal";
import NoticeToast from "./NoticeToast";
import SelectionPopover from "./SelectionPopover";

function ChatWorkspace() {
  const workspace = useChatWorkspace();
  const notice = useNoticeStore((s) => s.notice);

  return (
    <main className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-background text-foreground">
        <motion.div
          className="h-full min-h-0 w-full"
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          <ChatCanvas
            anchorGroupsByMessageKey={workspace.anchorGroupsByMessageKey}
            canvasRef={workspace.canvasRef}
            connectorPaths={workspace.connectorPaths}
            isPaneResizing={workspace.isPaneResizing}
            leftPaneWidthPx={workspace.leftPaneWidthPx}
            mainWindow={workspace.mainWindow}
            messagesByWindowId={workspace.messagesByWindowId}
            onCanvasPointerDown={workspace.onCanvasPointerDown}
            onComposerChange={workspace.onComposerChange}
            onEffortChange={workspace.onEffortChange}
            onGeometryChange={workspace.onGeometryChange}
            onHeaderPointerDown={workspace.onHeaderPointerDown}
            onMessageMouseDown={workspace.onMessageMouseDown}
            onModelChange={workspace.onModelChange}
            onOpenFreshRootWindow={workspace.onOpenFreshRootWindow}
            onPaneResizePointerDown={workspace.onPaneResizePointerDown}
            onResizePointerDown={workspace.onResizePointerDown}
            onRetry={workspace.onRetry}
            onSend={workspace.onSend}
            onToggleHistoryExpanded={workspace.onToggleHistoryExpanded}
            onWindowClose={workspace.onWindowClose}
            onWindowFocus={workspace.onWindowFocus}
            onWindowScrollStateChange={workspace.onWindowScrollStateChange}
            registerAnchorRef={workspace.registerAnchorRef}
            registerWindowRef={workspace.registerWindowRef}
            splitPaneRef={workspace.splitPaneRef}
            viewport={workspace.viewport}
            windowScrollStates={workspace.windowScrollStates}
            windows={workspace.windows}
          />
        </motion.div>

      {workspace.selectionState ? (
        <SelectionPopover
          onBranch={workspace.onSelectionBranch}
          popoverRef={workspace.popoverRef}
          selectionState={workspace.selectionState}
        />
      ) : null}

      {workspace.closePrompt ? (
        <CloseTreeModal
          closePrompt={workspace.closePrompt}
          onCancel={workspace.onClosePromptCancel}
          onConfirm={workspace.onClosePromptConfirm}
        />
      ) : null}

      <NoticeToast notice={notice} />
    </main>
  );
}

export default ChatWorkspace;
