import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import type { ReasoningEffort } from "../../types";
import { useModelStore } from "../../stores/modelStore";
import { resolveEffortForModel, resolveModelOption } from "../lib/modelOptions";

interface ChatWindowComposerProps {
  composer: string;
  isChildPane?: boolean;
  isStreaming: boolean;
  isFixedPane?: boolean;
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
  isChildPane = false,
  isStreaming,
  isFixedPane = false,
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

  const usesCompactControls = isChildPane || isFixedPane;
  const textareaBaseClassName = [
    "resize-none overflow-y-auto bg-transparent text-foreground/90 outline-none transition-colors",
    "placeholder:text-composer-placeholder placeholder:opacity-100 placeholder:font-normal",
  ].join(" ");
  const textareaClassName = [
    textareaBaseClassName,
    isChildPane
      ? "min-h-9 max-h-[92px] min-w-0 flex-1 px-3 py-2 text-[15px] leading-5 placeholder:text-[15px]"
      : isFixedPane
        ? "w-full min-h-[44px] max-h-[200px] px-4 py-3 text-[18px] leading-7 placeholder:text-[18px]"
        : "w-full min-h-[72px] max-h-[200px] py-2 text-[22px] leading-[1.45] placeholder:text-[22px]",
  ].join(" ");
  const composerShellClassName = [
    "rounded-2xl transition-colors",
    isFixedPane
      ? "border border-transparent bg-transparent"
      : isChildPane
        ? "shadow-[inset_0_1px_0_rgb(255_255_255_/_0.22)]"
        : "border border-transparent bg-composer-surface/88 focus-within:bg-composer-surface",
  ].join(" ");
  const pickerButtonClassName = [
    "cursor-pointer flex items-center rounded-lg text-muted-foreground transition-colors hover:bg-paper-sheet hover:text-foreground disabled:opacity-50 disabled:hover:bg-transparent",
    usesCompactControls
      ? "h-8 gap-1.5 px-2 text-xs"
      : "gap-2 px-3 py-2 text-[18px]",
  ].join(" ");
  const pickerItemTextClassName = usesCompactControls ? "text-xs" : "text-[18px]";
  const pickerIconSizeClassName = usesCompactControls ? "h-3.5 w-3.5" : "h-5 w-5";
  const pickerMenuPositionClassName = isChildPane ? "right-0" : "left-0";
  const controls = (
    <div
      ref={controlsRef}
      className={[
        "flex shrink-0 items-center gap-2",
        isChildPane ? "flex-nowrap" : "flex-wrap",
      ].join(" ")}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {models.length > 0 ? (
        <div className="relative">
          <button
            type="button"
            disabled={isStreaming}
            className={pickerButtonClassName}
            onClick={() =>
              setOpenPicker((current) =>
                current === "model" ? null : "model",
              )
            }
          >
            <span className={isChildPane ? "max-w-[120px] truncate" : "max-w-[200px] truncate"}>
              {resolvedSelectedModel}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`${pickerIconSizeClassName} transition-transform ${openPicker === "model" ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {openPicker === "model" ? (
            <div
              className={`absolute bottom-full ${pickerMenuPositionClassName} z-50 mb-1 min-w-[200px] rounded-lg border border-border bg-popover py-1 shadow-lg`}
            >
              {models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={`cursor-pointer w-full px-3 py-2 text-left ${pickerItemTextClassName} text-popover-foreground hover:bg-accent hover:text-accent-foreground ${
                    model.id === resolvedSelectedModel
                      ? "bg-accent font-medium text-primary-foreground"
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
            className={pickerButtonClassName}
            onClick={() =>
              setOpenPicker((current) =>
                current === "effort" ? null : "effort",
              )
            }
          >
            <span className={isChildPane ? "max-w-[96px] truncate" : "max-w-[160px] truncate"}>
              {getEffortLabel(resolvedSelectedEffort)}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`${pickerIconSizeClassName} transition-transform ${openPicker === "effort" ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {openPicker === "effort" ? (
            <div
              className={`absolute bottom-full ${pickerMenuPositionClassName} z-50 mb-1 min-w-[180px] rounded-lg border border-border bg-popover py-1 shadow-lg`}
            >
              {resolvedModelOption.efforts.map((effort) => (
                <button
                  key={effort}
                  type="button"
                  className={`w-full px-3 py-2 text-left ${pickerItemTextClassName} text-popover-foreground hover:bg-accent hover:text-accent-foreground ${
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
  );
  const submitButton = composer.trim().length > 0 && !isStreaming ? (
    <button
      className={[
        "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-80",
        isChildPane ? "h-9 w-9" : usesCompactControls ? "h-8 w-8" : "h-12 w-12",
      ].join(" ")}
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
        className={usesCompactControls ? "h-4 w-4" : "h-5 w-5"}
      >
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    </button>
  ) : null;

  return (
    <footer
      className={[
        "relative z-10",
        // isFixedPane
        // "border-t border-paper-stroke/12 bg-transparent px-4 pb-4",
      ].join(" ")}
    >
      <div className={composerShellClassName}>
        {isChildPane ? (
          <div className="flex min-w-0 items-end gap-2 px-4 py-3">
            <textarea
              ref={textareaRef}
              aria-label={`Message ${title}`}
              autoFocus
              rows={1}
              className={textareaClassName}
              placeholder={isFixedPane ? "Write something..." : "Ask a follow-up..."}
              value={composer}
              onChange={(event) => onComposerChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void onSend();
                }
              }}
            />
            {controls}
            {submitButton}
          </div>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              aria-label={`Message ${title}`}
              autoFocus
              rows={1}
              className={textareaClassName}
              placeholder={isFixedPane ? "Write something..." : "Ask a follow-up..."}
              value={composer}
              onChange={(event) => onComposerChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void onSend();
                }
              }}
            />
            <div
              className={[
                "flex items-center justify-between gap-3",
                isFixedPane ? "px-3 py-2" : "px-0 py-2",
              ].join(" ")}
            >
              {controls}
              {submitButton}
            </div>
          </>
        )}
      </div>
    </footer>
  );
}

export default ChatWindowComposer;
