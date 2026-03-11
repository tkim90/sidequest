import { memo, type PointerEvent as ReactPointerEvent } from "react";

import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
  WindowScrollState,
  WindowRecord,
} from "../../types";
import { snapToDevicePixel } from "../hooks/canvasUtils";
import type { ResizeEdges } from "../hooks/canvasTypes";
import { useChatWindowLayout } from "../hooks/useChatWindowLayout";
import ChatWindowComposer from "./ChatWindowComposer";
import ChatWindowHeader from "./ChatWindowHeader";
import ChatWindowMessages from "./ChatWindowMessages";
import ChatWindowResizeHandles from "./ChatWindowResizeHandles";

interface ChatWindowProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  isFocused: boolean;
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
}

const ChatWindow = memo(function ChatWindow({
  anchorGroupsByMessageKey,
  isFocused,
  onClose,
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
  onWindowFocus,
  onWindowScrollStateChange,
  registerAnchorRef,
  registerWindowRef,
  savedScrollState,
  windowData,
  messages,
  zIndex,
}: ChatWindowProps) {
  const { scrollRef, textareaRef, onMessagesScroll } = useChatWindowLayout({
    composer: windowData.composer,
    height: windowData.height,
    inheritedMessageCount: windowData.inheritedMessageCount,
    isFocused,
    isHistoryExpanded: windowData.isHistoryExpanded,
    messages,
    onGeometryChange,
    onWindowScrollStateChange,
    savedScrollState,
    windowId: windowData.id,
    width: windowData.width,
  });

  const snappedWindowX = snapToDevicePixel(windowData.x);
  const snappedWindowY = snapToDevicePixel(windowData.y);

  function handleWindowPointerDown(event: ReactPointerEvent<HTMLElement>): void {
    onWindowFocus(windowData.id);
    const target = event.target as HTMLElement;
    if (target.closest("textarea, input, button, select, [data-message-card]")) {
      return;
    }

    onHeaderPointerDown(event, windowData.id);
  }

  return (
    <article
      className="absolute origin-top-left grid cursor-grab grid-rows-[auto_1fr_auto] border border-border bg-card shadow-[var(--window-shadow)] active:cursor-grabbing"
      data-chat-window
      ref={(node) => registerWindowRef(windowData.id, node)}
      style={{
        transform: `translate(${snappedWindowX}px, ${snappedWindowY}px)`,
        width: windowData.width,
        height: windowData.height,
        zIndex,
      }}
      onPointerDown={handleWindowPointerDown}
    >
      <ChatWindowResizeHandles
        onResizePointerDown={(event, edges) =>
          onResizePointerDown(event, windowData.id, edges)
        }
      />

      <span className="absolute -top-7 rounded-sm border border-border bg-card px-2 py-0.5 text-[18px] font-semibold uppercase tracking-[0.10em] text-muted-foreground">
        {windowData.parentId ? "Branch" : "Main thread"}
      </span>

      <ChatWindowHeader
        branchFocus={windowData.branchFocus}
        onClose={() => onClose(windowData.id)}
        title={windowData.title}
      />

      <ChatWindowMessages
        anchorGroupsByMessageKey={anchorGroupsByMessageKey}
        historyPreviewCount={windowData.inheritedMessageCount}
        isFocused={isFocused}
        isHistoryExpanded={windowData.isHistoryExpanded}
        messages={messages}
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
        isStreaming={windowData.isStreaming}
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
    previous.savedScrollState === next.savedScrollState
  );
}

export default ChatWindow;
