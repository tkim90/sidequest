import ChatCanvas from "./ChatCanvas";
import CloseTreeModal from "./CloseTreeModal";
import NoticeToast from "./NoticeToast";
import SelectionPopover from "./SelectionPopover";
import WorkspaceHeader from "./WorkspaceHeader";
import { useChatWorkspace } from "../hooks/useChatWorkspace";

function ChatWorkspace() {
  const workspace = useChatWorkspace();

  return (
    <main className="min-h-screen bg-zinc-100 p-2 text-zinc-950 sm:p-3">
      <section className="relative grid h-[calc(100vh-1rem)] grid-rows-[auto_1fr] overflow-hidden border border-zinc-300 bg-white sm:h-[calc(100vh-1.5rem)]">
        <WorkspaceHeader
          hasChildWindows={workspace.hasChildWindows}
          onCloseAllChildWindows={workspace.onCloseAllChildWindows}
        />
        <ChatCanvas
          anchorGroupsByMessageKey={workspace.anchorGroupsByMessageKey}
          canvasRef={workspace.canvasRef}
          connectorPaths={workspace.connectorPaths}
          messagesByWindowId={workspace.messagesByWindowId}
          onCanvasPointerDown={workspace.onCanvasPointerDown}
          onComposerChange={workspace.onComposerChange}
          onGeometryChange={workspace.onGeometryChange}
          onHeaderPointerDown={workspace.onHeaderPointerDown}
          onResizePointerDown={workspace.onResizePointerDown}
          onMessageMouseUp={workspace.onMessageMouseUp}
          onOpenFreshRootWindow={workspace.onOpenFreshRootWindow}
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

      <NoticeToast notice={workspace.notice} />
    </main>
  );
}

export default ChatWorkspace;
