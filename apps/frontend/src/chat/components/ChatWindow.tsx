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
      className="message__content"
      data-message-id={message.id}
      onMouseUp={(event) => onMessageMouseUp(event, windowId, message.id)}
    >
      {segments.map((segment, index) => {
        if (segment.type === "anchor") {
          return (
            <span
              key={segment.key}
              className="anchor-highlight"
              ref={(node) => registerAnchorRef(segment.key, node)}
            >
              <span>{segment.text}</span>
              {segment.count > 1 ? (
                <span className="anchor-highlight__count">{segment.count}</span>
              ) : null}
            </span>
          );
        }

        return <span key={`${message.id}-segment-${index}`}>{segment.text}</span>;
      })}
      {message.status === "streaming" ? (
        <span className="stream-cursor" aria-hidden="true">
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
      className="chat-window"
      data-chat-window
      ref={(node) => registerWindowRef(windowData.id, node)}
      style={{
        transform: `translate3d(${windowData.x}px, ${windowData.y}px, 0)`,
        zIndex,
      }}
      onPointerDown={() => onWindowFocus(windowData.id)}
    >
      <header
        className="chat-window__header"
        onPointerDown={(event) => onHeaderPointerDown(event, windowData.id)}
      >
        <div>
          <p className="chat-window__eyebrow">
            {windowData.parentId ? "Branch" : "Main thread"}
          </p>
          <h2>{windowData.title}</h2>
          {windowData.branchFocus ? (
            <p className="chat-window__focus">
              Focus: "{windowData.branchFocus.selectedText}"
            </p>
          ) : (
            <p className="chat-window__focus chat-window__focus--muted">
              Start a conversation, then branch any phrase into its own path.
            </p>
          )}
        </div>
        <button
          className="icon-button"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onClose(windowData.id)}
        >
          Close
        </button>
      </header>

      <div
        className="chat-window__messages"
        ref={scrollRef}
        onScroll={onGeometryChange}
      >
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>No messages yet.</p>
            <p>Ask something here, then highlight a phrase to branch it.</p>
          </div>
        ) : null}

        {messages.map((message) => {
          const messageKey = `${windowData.id}:${message.id}`;
          const anchorGroups = anchorGroupsByMessageKey[messageKey] || [];

          return (
            <section
              key={message.id}
              className={`message message--${message.role}`}
            >
              <p className="message__label">
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

      <footer className="chat-window__composer">
        <textarea
          aria-label={`Message ${windowData.title}`}
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
          className="send-button"
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
