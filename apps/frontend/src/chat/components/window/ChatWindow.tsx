import { memo, type PointerEvent as ReactPointerEvent } from "react";

import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
  WindowScrollState,
  WindowRecord,
} from "../../../types";
import { snapToDevicePixel } from "../../hooks/canvasUtils";
import type { ResizeEdges } from "../../hooks/canvasTypes";
import { useChatWindowLayout } from "../../hooks/useChatWindowLayout";
import ChatWindowComposer from "../composer/ChatWindowComposer";
import ChatWindowHeader from "./ChatWindowHeader";
import ChatWindowMessages from "./ChatWindowMessages";
import ChatWindowResizeHandles from "./ChatWindowResizeHandles";

interface ChatWindowProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  alwaysShowCloseButton?: boolean;
  isFocused: boolean;
  mobileInteractionMode?: "scroll" | "scroll-first-swipe";
  onMobileBodyPointerDown?: React.ComponentProps<"div">["onPointerDown"];
  onMobileHeaderPointerDown?: React.ComponentProps<"header">["onPointerDown"];
  onClose: (windowId: string) => void;
  onComposerChange: (windowId: string, composer: string) => void;
  onGeometryChange: () => void;
  onHeaderPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
  ) => void;
  onModelChange: (windowId: string, model: string) => void;
  onEffortChange: (windowId: string, effort: WindowRecord["selectedEffort"]) => void;
  onResizePointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ) => void;
  onMessageMouseDown: React.ComponentProps<typeof ChatWindowMessages>["onMessageMouseDown"];
  onNavigateToBranchSource: (
    windowId: string,
    branchAnchorId: string | null,
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
  savedScrollState: WindowScrollState;
  windowData: WindowRecord;
  messages: MessageRecord[];
  zIndex: number;
  isFixedPane?: boolean;
  showFixedPaneCloseButton?: boolean;
}

const ChatWindow = memo(function ChatWindow({
  anchorGroupsByMessageKey,
  alwaysShowCloseButton = false,
  isFocused,
  mobileInteractionMode,
  onMobileBodyPointerDown,
  onMobileHeaderPointerDown,
  onClose,
  onComposerChange,
  onGeometryChange,
  onHeaderPointerDown,
  onModelChange,
  onEffortChange,
  onResizePointerDown,
  onMessageMouseDown,
  onNavigateToBranchSource,
  onRetry,
  onSend,
  onToggleHistoryExpanded,
  onWindowFocus,
  onWindowScrollStateChange,
  registerAnchorRef,
  registerWindowRef,
  savedScrollState,
  windowData,
  messages,
  zIndex,
  isFixedPane = false,
  showFixedPaneCloseButton = false,
}: ChatWindowProps) {
  const isCompactPane = !isFixedPane;
  const { scrollRef, textareaRef, onMessagesScroll } = useChatWindowLayout({
    composer: windowData.composer,
    height: windowData.height,
    inheritedMessageCount: windowData.inheritedMessageCount,
    isFocused,
    isHistoryExpanded: windowData.isHistoryExpanded,
    isStreaming: windowData.isStreaming,
    isChildPane: isCompactPane,
    messages,
    onGeometryChange,
    onWindowScrollStateChange,
    savedScrollState,
    windowId: windowData.id,
    width: windowData.width,
  });

  const snappedWindowX = snapToDevicePixel(windowData.x);
  const snappedWindowY = snapToDevicePixel(windowData.y);
  const dynamicStyle = isFixedPane
    ? undefined
    : {
        transform: `translate3d(${snappedWindowX}px, ${snappedWindowY}px, 0)`,
        width: windowData.width,
        height: windowData.height,
        zIndex,
      };

  function handleWindowPointerDown(event: ReactPointerEvent<HTMLElement>): void {
    if (isFixedPane) {
      return;
    }

    onWindowFocus(windowData.id);
    const target = event.target as HTMLElement;
    if (target.closest("textarea, input, button, select, [data-message-card]")) {
      return;
    }

    onHeaderPointerDown(event, windowData.id);
  }

  return (
    <article
      className={[
        "grid grid-rows-[auto_1fr_auto]",
        isFixedPane
          ? "relative h-full w-full min-w-0 overflow-hidden bg-transparent shadow-none"
          : "group/chat-window absolute origin-top-left min-w-0 cursor-grab overflow-hidden rounded-[26px] bg-paper-window shadow-[var(--paper-window-shadow)] will-change-transform active:cursor-grabbing",
      ].join(" ")}
      data-chat-window
      ref={(node) => registerWindowRef(windowData.id, node)}
      style={dynamicStyle}
      onPointerDown={handleWindowPointerDown}
    >
      {isFixedPane ? null : (
        <>
          <div
            aria-hidden
            className="paper-texture-window pointer-events-none absolute inset-0 z-0"
          />
        </>
      )}

      {isFixedPane ? null : (
        <ChatWindowResizeHandles
          onResizePointerDown={(event, edges) =>
            onResizePointerDown(event, windowData.id, edges)
          }
        />
      )}

      <ChatWindowHeader
        alwaysShowCloseButton={alwaysShowCloseButton}
        branchAnchorId={windowData.branchAnchorId}
        branchFocus={windowData.branchFocus}
        isFixedPane={isFixedPane}
        onMobileDragPointerDown={onMobileHeaderPointerDown}
        onNavigateToBranchSource={() =>
          onNavigateToBranchSource(windowData.id, windowData.branchAnchorId)
        }
        onClose={() => onClose(windowData.id)}
        showCloseButton={isFixedPane ? showFixedPaneCloseButton : true}
        title={windowData.title}
      />

      <ChatWindowMessages
        anchorGroupsByMessageKey={anchorGroupsByMessageKey}
        historyPreviewCount={windowData.inheritedMessageCount}
        isFocused={isFocused}
        isFixedPane={isFixedPane}
        isHistoryExpanded={windowData.isHistoryExpanded}
        messages={messages}
        mobileInteractionMode={mobileInteractionMode}
        onMobileBodyPointerDown={onMobileBodyPointerDown}
        onMessageMouseDown={onMessageMouseDown}
        onStarterQuestionClick={(question) => onSend(windowData.id, question)}
        onRetry={(messageId) => onRetry(windowData.id, messageId)}
        onScroll={onMessagesScroll}
        onToggleHistoryExpanded={() => onToggleHistoryExpanded(windowData.id)}
        registerAnchorRef={registerAnchorRef}
        scrollRef={scrollRef}
        windowId={windowData.id}
      />

      <ChatWindowComposer
        composer={windowData.composer}
        isChildPane={isCompactPane}
        isStreaming={windowData.isStreaming}
        isFixedPane={isFixedPane}
        onComposerChange={(composer) => onComposerChange(windowData.id, composer)}
        onModelChange={(model) => onModelChange(windowData.id, model)}
        onEffortChange={(effort) => onEffortChange(windowData.id, effort)}
        onSend={() => onSend(windowData.id)}
        selectedModel={windowData.selectedModel}
        selectedEffort={windowData.selectedEffort}
        textareaRef={textareaRef}
        title={windowData.title}
      />
    </article>
  );
}, areChatWindowPropsEqual);

function areChatWindowPropsEqual(
  previous: ChatWindowProps,
  next: ChatWindowProps,
): boolean {
  return (
    previous.windowData === next.windowData &&
    previous.messages === next.messages &&
    previous.isFocused === next.isFocused &&
    previous.zIndex === next.zIndex &&
    previous.anchorGroupsByMessageKey === next.anchorGroupsByMessageKey &&
    previous.savedScrollState === next.savedScrollState &&
    previous.isFixedPane === next.isFixedPane &&
    previous.showFixedPaneCloseButton === next.showFixedPaneCloseButton &&
    previous.alwaysShowCloseButton === next.alwaysShowCloseButton &&
    previous.mobileInteractionMode === next.mobileInteractionMode &&
    previous.onMobileBodyPointerDown === next.onMobileBodyPointerDown &&
    previous.onMobileHeaderPointerDown === next.onMobileHeaderPointerDown
  );
}

export default ChatWindow;
