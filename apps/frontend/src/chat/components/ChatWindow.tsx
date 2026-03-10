import { type PointerEvent as ReactPointerEvent } from "react";

import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
  WindowScrollState,
  WindowRecord,
} from "../../types";
import { useChatWindowLayout } from "../hooks/useChatWindowLayout";
import type { ResizeEdges } from "../hooks/canvasTypes";
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
  onResizePointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ) => void;
  onMessageMouseUp: React.ComponentProps<typeof ChatWindowMessages>["onMessageMouseUp"];
  onSend: (windowId: string) => void | Promise<void>;
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

function ChatWindow({
  anchorGroupsByMessageKey,
  isFocused,
  onClose,
  onComposerChange,
  onGeometryChange,
  onHeaderPointerDown,
  onResizePointerDown,
  onMessageMouseUp,
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

  function handleWindowPointerDown(event: ReactPointerEvent<HTMLElement>): void {
    onWindowFocus(windowData.id);
    const target = event.target as HTMLElement;
    if (target.closest("textarea, input, button, [data-message-card]")) {
      return;
    }

    onHeaderPointerDown(event, windowData.id);
  }

  return (
    <article
      className="absolute origin-top-left grid grid-rows-[auto_1fr_auto] cursor-grab border border-zinc-300 bg-white shadow-[8px_8px_0_0_rgba(24,24,27,0.08)] will-change-transform active:cursor-grabbing"
      data-chat-window
      ref={(node) => registerWindowRef(windowData.id, node)}
      style={{
        transform: `translate3d(${windowData.x}px, ${windowData.y}px, 0)`,
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

      <span className="absolute -top-7 rounded-sm border border-zinc-300 bg-white px-2 py-0.5 text-[18px] font-semibold uppercase tracking-[0.10em] text-zinc-500">
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
        onMessageMouseUp={onMessageMouseUp}
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
        onSend={() => onSend(windowData.id)}
        textareaRef={textareaRef}
        title={windowData.title}
      />
    </article>
  );
}

export default ChatWindow;
