import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import type { ReasoningEffort } from "../../types";
import { useModelStore } from "../../stores/modelStore";
import { resolveEffortForModel, resolveModelOption } from "../lib/modelOptions";

interface ChatWindowComposerProps {
  composer: string;
  isStreaming: boolean;
  onComposerChange: (composer: string) => void;
  onModelChange: (model: string) => void;
  onEffortChange: (effort: ReasoningEffort | null) => void;
  onSend: () => void | Promise<void>;
  selectedModel: string | null;
  selectedEffort: ReasoningEffort | null;
  title: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

function getEffortLabel(effort: ReasoningEffort): string {
  return effort === "none" ? "Effort: off" : `Effort: ${effort}`;
}

function ChatWindowComposer({
  composer,
  isStreaming,
  onComposerChange,
  onModelChange,
  onEffortChange,
  onSend,
  selectedModel,
  selectedEffort,
  title,
  textareaRef,
}: ChatWindowComposerProps) {
  const models = useModelStore((state) => state.models);
  const modelsById = useModelStore((state) => state.modelsById);
  const defaultModel = useModelStore((state) => state.defaultModel);
  const resolvedModelOption = resolveModelOption(
    modelsById,
    selectedModel,
    defaultModel,
    models,
  );
  const resolvedSelectedModel = resolvedModelOption?.id ?? "";
  const resolvedSelectedEffort = resolveEffortForModel(
    resolvedModelOption,
    selectedEffort,
  );
  const showEffortPicker = Boolean(
    resolvedModelOption && resolvedModelOption.efforts.length > 0,
  );
  const [openPicker, setOpenPicker] = useState<"model" | "effort" | null>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(event.target as Node)
      ) {
        setOpenPicker(null);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  useEffect(() => {
    if (showEffortPicker) {
      return;
    }

    setOpenPicker((current) => (current === "effort" ? null : current));
  }, [showEffortPicker]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPicker(null);
      }
    }

    if (openPicker) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [openPicker]);

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
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <div
            ref={controlsRef}
            className="flex flex-wrap items-center gap-2"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {models.length > 0 ? (
              <div className="relative">
                <button
                  type="button"
                  disabled={isStreaming}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:hover:bg-transparent"
                  onClick={() =>
                    setOpenPicker((current) =>
                      current === "model" ? null : "model",
                    )
                  }
                >
                  <span className="max-w-[200px] truncate">
                    {resolvedSelectedModel}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`h-3.5 w-3.5 transition-transform ${openPicker === "model" ? "rotate-180" : ""}`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {openPicker === "model" ? (
                  <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[200px] rounded-lg border border-border bg-popover py-1 shadow-lg">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        className={`w-full px-3 py-2 text-left text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground ${
                          model.id === resolvedSelectedModel
                            ? "bg-accent font-medium text-accent-foreground"
                            : ""
                        }`}
                        onClick={() => {
                          onModelChange(model.id);
                          setOpenPicker(null);
                        }}
                      >
                        {model.id}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {showEffortPicker && resolvedModelOption && resolvedSelectedEffort ? (
              <div className="relative">
                <button
                  type="button"
                  disabled={isStreaming}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:hover:bg-transparent"
                  onClick={() =>
                    setOpenPicker((current) =>
                      current === "effort" ? null : "effort",
                    )
                  }
                >
                  <span className="max-w-[160px] truncate">
                    {getEffortLabel(resolvedSelectedEffort)}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`h-3.5 w-3.5 transition-transform ${openPicker === "effort" ? "rotate-180" : ""}`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {openPicker === "effort" ? (
                  <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[180px] rounded-lg border border-border bg-popover py-1 shadow-lg">
                    {resolvedModelOption.efforts.map((effort) => (
                      <button
                        key={effort}
                        type="button"
                        className={`w-full px-3 py-2 text-left text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground ${
                          effort === resolvedSelectedEffort
                            ? "bg-accent font-medium text-accent-foreground"
                            : ""
                        }`}
                        onClick={() => {
                          onEffortChange(effort);
                          setOpenPicker(null);
                        }}
                      >
                        {getEffortLabel(effort)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {composer.trim().length > 0 && !isStreaming ? (
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-80"
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
