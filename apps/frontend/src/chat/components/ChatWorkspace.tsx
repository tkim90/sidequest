import { motion } from "motion/react";

import { useNoticeStore } from "../../stores/noticeStore";
import { useChatWorkspace } from "../hooks/useChatWorkspace";
import ChatCanvas from "./ChatCanvas";
import CloseTreeModal from "./CloseTreeModal";
import NoticeToast from "./NoticeToast";
import SelectionPopover from "./SelectionPopover";
import WorkspaceHeader from "./WorkspaceHeader";

function ChatWorkspace() {
  const workspace = useChatWorkspace();
  const notice = useNoticeStore((s) => s.notice);

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6">
      <section className="relative grid h-[calc(100vh-2rem)] grid-rows-[auto_1fr] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.08)] sm:h-[calc(100vh-3rem)]">
        <WorkspaceHeader
          hasChildWindows={workspace.hasChildWindows}
          onCloseAllChildWindows={workspace.onCloseAllChildWindows}
          onOpenFreshRootWindow={workspace.onOpenFreshRootWindow}
        />

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="min-h-0"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          <ChatCanvas
            anchorGroupsByMessageKey={workspace.anchorGroupsByMessageKey}
            canvasRef={workspace.canvasRef}
            connectorPaths={workspace.connectorPaths}
            mainWindow={workspace.mainWindow}
            messagesByWindowId={workspace.messagesByWindowId}
            onCanvasPointerDown={workspace.onCanvasPointerDown}
            onComposerChange={workspace.onComposerChange}
            onEffortChange={workspace.onEffortChange}
            onGeometryChange={workspace.onGeometryChange}
            onHeaderPointerDown={workspace.onHeaderPointerDown}
            onMessageMouseDown={workspace.onMessageMouseDown}
            onModelChange={workspace.onModelChange}
            onResizePointerDown={workspace.onResizePointerDown}
            onRetry={workspace.onRetry}
            onSend={workspace.onSend}
            onToggleHistoryExpanded={workspace.onToggleHistoryExpanded}
            onWindowClose={workspace.onWindowClose}
            onWindowFocus={workspace.onWindowFocus}
            onWindowScrollStateChange={workspace.onWindowScrollStateChange}
            registerAnchorRef={workspace.registerAnchorRef}
            registerWindowRef={workspace.registerWindowRef}
            viewport={workspace.viewport}
            windowScrollStates={workspace.windowScrollStates}
            windows={workspace.windows}
          />
        </motion.div>
      </section>

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
