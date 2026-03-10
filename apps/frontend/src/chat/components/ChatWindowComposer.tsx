import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { MAX_CHARS_PER_MESSAGE } from "../lib/safeguards";

interface ChatWindowComposerProps {
  availableModels: string[];
  composer: string;
  isStreaming: boolean;
  onComposerChange: (composer: string) => void;
  onModelChange: (model: string) => void;
  onSend: () => void | Promise<void>;
  selectedModel: string | null;
  title: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  windowId: string;
}

function ChatWindowComposer({
  availableModels,
  composer,
  isStreaming,
  onComposerChange,
  onModelChange,
  onSend,
  selectedModel,
  title,
  textareaRef,
  windowId,
}: ChatWindowComposerProps) {
  const resolvedSelectedModel = selectedModel ?? availableModels[0] ?? "";
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (
        modelPickerRef.current &&
        !modelPickerRef.current.contains(event.target as Node)
      ) {
        setIsModelPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModelPickerOpen(false);
      }
    }
    if (isModelPickerOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isModelPickerOpen]);

  return (
    <footer className="border-t border-border bg-card p-4">
      <div className="rounded-2xl border border-border bg-secondary transition-colors focus-within:border-ring">
        <textarea
          ref={textareaRef}
          aria-label={`Message ${title}`}
          autoFocus
          rows={1}
          className="min-h-[40px] max-h-[200px] w-full resize-none overflow-y-auto bg-transparent px-4 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
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
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-3">
          {availableModels.length > 0 ? (
            <div
              ref={modelPickerRef}
              className="relative"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                disabled={isStreaming}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:hover:bg-transparent"
                onClick={() => setIsModelPickerOpen((prev) => !prev)}
              >
                <span className="max-w-[200px] truncate">
                  {resolvedSelectedModel}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-3.5 w-3.5 transition-transform ${isModelPickerOpen ? "rotate-180" : ""}`}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isModelPickerOpen && (
                <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[200px] rounded-lg border border-border bg-popover py-1 shadow-lg">
                  {availableModels.map((model) => (
                    <button
                      key={model}
                      type="button"
                      className={`w-full px-3 py-2 text-left text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground ${
                        model === resolvedSelectedModel
                          ? "bg-accent font-medium text-accent-foreground"
                          : ""
                      }`}
                      onClick={() => {
                        onModelChange(model);
                        setIsModelPickerOpen(false);
                      }}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div />
          )}
          {composer.length > MAX_CHARS_PER_MESSAGE * 0.8 ? (
            <span
              className={`text-[11px] tabular-nums ${
                composer.length >= MAX_CHARS_PER_MESSAGE
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {composer.length}/{MAX_CHARS_PER_MESSAGE}
            </span>
          ) : null}
          </div>
          {composer.trim().length > 0 && !isStreaming ? (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-80"
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
      </div>
    </footer>
  );
}

export default ChatWindowComposer;
