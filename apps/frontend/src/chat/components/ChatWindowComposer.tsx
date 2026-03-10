import type { RefObject } from "react";

interface ChatWindowComposerProps {
  composer: string;
  isStreaming: boolean;
  onComposerChange: (composer: string) => void;
  onSend: () => void | Promise<void>;
  title: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

function ChatWindowComposer({
  composer,
  isStreaming,
  onComposerChange,
  onSend,
  title,
  textareaRef,
}: ChatWindowComposerProps) {
  return (
    <footer className="border-t border-zinc-300 bg-white p-4">
      <div className="relative flex items-end rounded-2xl border border-zinc-300 bg-zinc-50 transition-colors focus-within:border-zinc-500">
        <textarea
          ref={textareaRef}
          aria-label={`Message ${title}`}
          autoFocus
          rows={1}
          className="min-h-[40px] max-h-[200px] flex-1 resize-none overflow-y-auto bg-transparent px-4 py-3 pr-12 text-sm leading-6 text-zinc-950 outline-none placeholder:text-zinc-400"
          placeholder="Ask a follow-up..."
          value={composer}
          onChange={(event) => onComposerChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void onSend();
            }
          }}
        />
        {composer.trim().length > 0 && !isStreaming ? (
          <button
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-white transition-opacity hover:opacity-80"
            type="button"
            onClick={() => {
              void onSend();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        ) : null}
      </div>
    </footer>
  );
}

export default ChatWindowComposer;
