import {
  memo,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
  WindowRecord,
} from "../../types";
import type { ResizeEdges } from "../hooks/useCanvasInteractions";
import MessageContent from "./MessageContent";
import {
  eyebrowClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./ui";

interface ChatWindowProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
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
  onMessageMouseUp: React.ComponentProps<typeof MessageContent>["onMessageMouseUp"];
  onSend: (windowId: string) => void | Promise<void>;
  onWindowFocus: (windowId: string) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
  windowData: WindowRecord;
  messages: MessageRecord[];
  zIndex: number;
}

interface ChatMessageCardProps {
  windowId: string;
  message: MessageRecord;
  anchorGroups: AnchorGroupsByMessageKey[string];
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  onMessageMouseUp: ChatWindowProps["onMessageMouseUp"];
}

const resizeHandles: Array<{
  key: string;
  className: string;
  edges: ResizeEdges;
}> = [
  {
    key: "top",
    className: "absolute inset-x-3 top-0 z-20 h-2 cursor-n-resize",
    edges: { north: true, south: false, east: false, west: false },
  },
  {
    key: "right",
    className: "absolute inset-y-3 right-0 z-20 w-2 cursor-e-resize",
    edges: { north: false, south: false, east: true, west: false },
  },
  {
    key: "bottom",
    className: "absolute inset-x-3 bottom-0 z-20 h-2 cursor-s-resize",
    edges: { north: false, south: true, east: false, west: false },
  },
  {
    key: "left",
    className: "absolute inset-y-3 left-0 z-20 w-2 cursor-w-resize",
    edges: { north: false, south: false, east: false, west: true },
  },
  {
    key: "top-left",
    className: "absolute left-0 top-0 z-20 h-3 w-3 cursor-nwse-resize",
    edges: { north: true, south: false, east: false, west: true },
  },
  {
    key: "top-right",
    className: "absolute right-0 top-0 z-20 h-3 w-3 cursor-nesw-resize",
    edges: { north: true, south: false, east: true, west: false },
  },
  {
    key: "bottom-right",
    className: "absolute bottom-0 right-0 z-20 h-3 w-3 cursor-nwse-resize",
    edges: { north: false, south: true, east: true, west: false },
  },
  {
    key: "bottom-left",
    className: "absolute bottom-0 left-0 z-20 h-3 w-3 cursor-nesw-resize",
    edges: { north: false, south: true, east: false, west: true },
  },
];

const ChatMessageCard = memo(function ChatMessageCard({
  windowId,
  message,
  anchorGroups,
  registerAnchorRef,
  onMessageMouseUp,
}: ChatMessageCardProps) {
  const messageClassName =
    message.role === "user"
      ? "self-end border border-zinc-950 bg-zinc-950 text-zinc-50"
      : "self-start border border-zinc-300 bg-white text-zinc-950";
  const messageLabelClassName =
    message.role === "user"
      ? "mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400"
      : `${eyebrowClassName} mb-3`;

  return (
    <section className={`w-[92%] cursor-text select-text px-4 py-4 ${messageClassName}`}>
      <p className={messageLabelClassName}>
        {message.role === "user" ? "You" : "Assistant"}
      </p>
      <MessageContent
        windowId={windowId}
        message={message}
        anchorGroups={anchorGroups}
        registerAnchorRef={registerAnchorRef}
        onMessageMouseUp={onMessageMouseUp}
      />
    </section>
  );
}, areChatMessageCardPropsEqual);

function areChatMessageCardPropsEqual(
  previous: ChatMessageCardProps,
  next: ChatMessageCardProps,
): boolean {
  return (
    previous.windowId === next.windowId &&
    previous.message === next.message &&
    previous.anchorGroups === next.anchorGroups
  );
}

function ChatWindow({
  anchorGroupsByMessageKey,
  onClose,
  onComposerChange,
  onGeometryChange,
  onHeaderPointerDown,
  onResizePointerDown,
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
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    if (shouldAutoScrollRef.current) {
      node.scrollTop = node.scrollHeight;
    }

    onGeometryChange();
  }, [messages, onGeometryChange, windowData.height, windowData.width]);

  function handleMessagesScroll(): void {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const distanceFromBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom <= 32;
    onGeometryChange();
  }

  return (
    <article
      className="absolute grid grid-rows-[auto_1fr_auto] overflow-hidden border border-zinc-300 bg-white shadow-[8px_8px_0_0_rgba(24,24,27,0.08)] origin-top-left will-change-transform"
      data-chat-window
      ref={(node) => registerWindowRef(windowData.id, node)}
      style={{
        transform: `translate3d(${windowData.x}px, ${windowData.y}px, 0)`,
        width: windowData.width,
        height: windowData.height,
        zIndex,
      }}
      onPointerDown={() => onWindowFocus(windowData.id)}
    >
      {resizeHandles.map((handle) => (
        <span
          key={handle.key}
          aria-hidden="true"
          className={handle.className}
          onPointerDown={(event) =>
            onResizePointerDown(event, windowData.id, handle.edges)
          }
        />
      ))}

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
        onScroll={handleMessagesScroll}
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

          return (
            <ChatMessageCard
              key={message.id}
              windowId={windowData.id}
              message={message}
              anchorGroups={anchorGroups}
              registerAnchorRef={registerAnchorRef}
              onMessageMouseUp={onMessageMouseUp}
            />
          );
        })}
      </div>

      <footer className="grid grid-cols-1 gap-3 border-t border-zinc-300 bg-white p-4 md:grid-cols-[1fr_auto] md:items-stretch">
        <textarea
          aria-label={`Message ${windowData.title}`}
          autoFocus
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
