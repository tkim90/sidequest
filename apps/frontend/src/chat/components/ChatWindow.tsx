import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type {
  AnchorGroup,
  AnchorGroupsByMessageKey,
  MessageRecord,
  WindowRecord,
} from "../../types";
import { splitContentByAnchors } from "../lib/anchors";
import {
  eyebrowClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./ui";

interface RenderMessageContentProps {
  windowId: string;
  message: MessageRecord;
  anchorGroups: AnchorGroup[];
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  onMessageMouseUp: (
    event: ReactMouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
}

interface ChatWindowProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  onClose: (windowId: string) => void;
  onComposerChange: (windowId: string, composer: string) => void;
  onGeometryChange: () => void;
  onHeaderPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
  ) => void;
  onMessageMouseUp: (
    event: ReactMouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onSend: (windowId: string) => void | Promise<void>;
  onWindowFocus: (windowId: string) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
  windowData: WindowRecord;
  messages: MessageRecord[];
  zIndex: number;
}

function renderMessageContent({
  windowId,
  message,
  anchorGroups,
  registerAnchorRef,
  onMessageMouseUp,
}: RenderMessageContentProps) {
  const segments = splitContentByAnchors(message.content, anchorGroups);

  return (
    <div
      className="whitespace-pre-wrap break-words text-[15px] leading-7"
      data-message-id={message.id}
      onMouseUp={(event) => onMessageMouseUp(event, windowId, message.id)}
    >
      {segments.map((segment, index) => {
        if (segment.type === "anchor") {
          return (
            <span
              key={segment.key}
              className="inline-flex items-center gap-2 border border-yellow-400 bg-yellow-200 px-1.5 py-0.5"
              ref={(node) => registerAnchorRef(segment.key, node)}
            >
              <span>{segment.text}</span>
              {segment.count > 1 ? (
                <span className="inline-flex min-w-5 justify-center border border-yellow-500 bg-yellow-50 px-1 text-[11px] font-semibold text-yellow-800">
                  {segment.count}
                </span>
              ) : null}
            </span>
          );
        }

        return <span key={`${message.id}-segment-${index}`}>{segment.text}</span>;
      })}
      {message.status === "streaming" ? (
        <span className="ml-0.5 inline-block animate-pulse font-semibold" aria-hidden="true">
          |
        </span>
      ) : null}
    </div>
  );
}

function ChatWindow({
  anchorGroupsByMessageKey,
  onClose,
  onComposerChange,
  onGeometryChange,
  onHeaderPointerDown,
  onMessageMouseUp,
  onSend,
  onWindowFocus,
  registerAnchorRef,
  registerWindowRef,
  windowData,
  messages,
  zIndex,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
    onGeometryChange();
  }, [messages, onGeometryChange]);

  return (
    <article
      className="absolute grid h-[720px] w-[560px] max-h-[calc(100vh-7rem)] max-w-[calc(100vw-2rem)] grid-rows-[auto_1fr_auto] overflow-hidden border border-zinc-300 bg-white shadow-[8px_8px_0_0_rgba(24,24,27,0.08)] origin-top-left will-change-transform"
      data-chat-window
      ref={(node) => registerWindowRef(windowData.id, node)}
      style={{
        transform: `translate3d(${windowData.x}px, ${windowData.y}px, 0)`,
        zIndex,
      }}
      onPointerDown={() => onWindowFocus(windowData.id)}
    >
      <header
        className="flex cursor-grab justify-between gap-4 border-b border-zinc-300 bg-zinc-100 px-5 py-4 active:cursor-grabbing"
        onPointerDown={(event) => onHeaderPointerDown(event, windowData.id)}
      >
        <div>
          <p className={eyebrowClassName}>
            {windowData.parentId ? "Branch" : "Main thread"}
          </p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-950">
            {windowData.title}
          </h2>
          {windowData.branchFocus ? (
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-700">
              Focus: "{windowData.branchFocus.selectedText}"
            </p>
          ) : (
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">
              Start a conversation, then branch any phrase into its own path.
            </p>
          )}
        </div>
        <button
          className={`${secondaryButtonClassName} shrink-0 self-start`}
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onClose(windowData.id)}
        >
          Close
        </button>
      </header>

      <div
        className="flex flex-col gap-4 overflow-auto p-5"
        ref={scrollRef}
        onScroll={onGeometryChange}
      >
        {messages.length === 0 ? (
          <div className="my-auto border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
            <p className="m-0">No messages yet.</p>
            <p className="mt-2 m-0">
              Ask something here, then highlight a phrase to branch it.
            </p>
          </div>
        ) : null}

        {messages.map((message) => {
          const messageKey = `${windowData.id}:${message.id}`;
          const anchorGroups = anchorGroupsByMessageKey[messageKey] || [];
          const messageClassName =
            message.role === "user"
              ? "self-end border border-zinc-950 bg-zinc-950 text-zinc-50"
              : "self-start border border-zinc-300 bg-white text-zinc-950";
          const messageLabelClassName =
            message.role === "user"
              ? "mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400"
              : `${eyebrowClassName} mb-3`;

          return (
            <section
              key={message.id}
              className={`w-[92%] px-4 py-4 ${messageClassName}`}
            >
              <p className={messageLabelClassName}>
                {message.role === "user" ? "You" : "Assistant"}
              </p>
              {renderMessageContent({
                windowId: windowData.id,
                message,
                anchorGroups,
                registerAnchorRef,
                onMessageMouseUp,
              })}
            </section>
          );
        })}
      </div>

      <footer className="grid grid-cols-1 gap-3 border-t border-zinc-300 bg-white p-4 md:grid-cols-[1fr_auto] md:items-stretch">
        <textarea
          aria-label={`Message ${windowData.title}`}
          className="min-h-28 w-full resize-none border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-600"
          placeholder="Ask a follow-up..."
          value={windowData.composer}
          onChange={(event) => onComposerChange(windowData.id, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void onSend(windowData.id);
            }
          }}
        />
        <button
          className={`${primaryButtonClassName} min-h-12 md:min-w-28`}
          type="button"
          disabled={windowData.isStreaming}
          onClick={() => {
            void onSend(windowData.id);
          }}
        >
          {windowData.isStreaming ? "Streaming..." : "Send"}
        </button>
      </footer>
    </article>
  );
}

export default ChatWindow;
