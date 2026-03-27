import { motion } from "motion/react";

import { useNoticeStore } from "../../../stores/noticeStore";
import { useChatWorkspace } from "../../hooks/useChatWorkspace";
import ChatCanvas from "./ChatCanvas";
import CloseTreeModal from "./CloseTreeModal";
import MobileNotesToolbar from "./MobileNotesToolbar";
import NoticeToast from "./NoticeToast";
import PaperTextureDefs from "./PaperTextureDefs";
import SelectionPopover, { getSelectionIdentityKey } from "./SelectionPopover";

function ChatWorkspace() {
  const workspace = useChatWorkspace();
  const notice = useNoticeStore((s) => s.notice);

  return (
    <main className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <PaperTextureDefs />

      <motion.div
        className="h-full min-h-0 w-full"
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      >
        {workspace.isMobileView ? (
          <MobileNotesToolbar
            hasNotes={workspace.hasChildWindows}
            isNotesOpen={workspace.isMobileNotesOpen}
            onAddNote={() => {
              workspace.onOpenFreshRootWindow();
              workspace.onMobileNotesOpen();
            }}
            onCloseNotes={workspace.onMobileNotesClose}
            onOpenNotes={workspace.onMobileNotesOpen}
          />
        ) : null}

        <ChatCanvas
          anchorGroupsByMessageKey={workspace.anchorGroupsByMessageKey}
          canvasRef={workspace.canvasRef}
          isPaneResizing={workspace.isPaneResizing}
          isMobileNotesOpen={workspace.isMobileNotesOpen}
          isMobileView={workspace.isMobileView}
          leftPaneWidthPx={workspace.leftPaneWidthPx}
          mainWindow={workspace.mainWindow}
          messagesByWindowId={workspace.messagesByWindowId}
          visualizationsByWindowId={workspace.visualizationsByWindowId}
          onCanvasPointerDown={workspace.onCanvasPointerDown}
          onCanvasWheel={workspace.onCanvasWheel}
          onComposerChange={workspace.onComposerChange}
          onEffortChange={workspace.onEffortChange}
          onGeometryChange={workspace.onGeometryChange}
          onHeaderPointerDown={workspace.onHeaderPointerDown}
          onMessageMouseDown={workspace.onMessageMouseDown}
          onNavigateToBranchSource={workspace.onNavigateToBranchSource}
          onModelChange={workspace.onModelChange}
          onOpenFreshRootWindow={workspace.onOpenFreshRootWindow}
          onMobileNotesClose={workspace.onMobileNotesClose}
          onMobilePreferredNoteHandled={workspace.onMobilePreferredNoteHandled}
          onPaneResizePointerDown={workspace.onPaneResizePointerDown}
          onResizePointerDown={workspace.onResizePointerDown}
          onRetry={workspace.onRetry}
          preferredMobileNoteWindowId={workspace.preferredMobileNoteWindowId}
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
          key={getSelectionIdentityKey(workspace.selectionState)}
          onBranchExpand={workspace.onSelectionBranchExpand}
          onBranchSubmit={workspace.onSelectionBranch}
          onVisualizeExpand={workspace.onSelectionVisualizeExpand}
          onVisualizeSubmit={workspace.onSelectionVisualize}
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
