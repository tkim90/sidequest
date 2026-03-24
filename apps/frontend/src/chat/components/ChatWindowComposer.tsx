import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import type { ReasoningEffort } from "../../types";
import { useModelStore } from "../../stores/modelStore";
import { resolveEffortForModel, resolveModelOption } from "../lib/modelOptions";
import ComposerSendButton from "./ComposerSendButton";
import EffortPicker from "./EffortPicker";
import ModelPicker from "./ModelPicker";

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
  const pickerMenuPositionClassName = isChildPane ? "right-0" : "left-0";
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
    "w-full min-w-0 rounded-2xl transition-colors",
    isFixedPane
      ? "border border-transparent bg-transparent"
      : isChildPane
        ? "shadow-[inset_0_1px_0_rgb(255_255_255_/_0.22)]"
        : "border border-transparent bg-composer-surface/88 focus-within:bg-composer-surface",
  ].join(" ");

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSend();
    }
  }

  const canSend = composer.trim().length > 0 && !isStreaming;
  const placeholder = isFixedPane ? "Write something..." : "Ask a follow-up...";

  const controls = (
    <div
      ref={controlsRef}
      className={[
        "flex shrink-0 items-center gap-2",
        isChildPane ? "flex-nowrap" : "flex-wrap",
      ].join(" ")}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <ModelPicker
        compact={usesCompactControls}
        isOpen={openPicker === "model"}
        models={models}
        onSelect={(modelId) => {
          onModelChange(modelId);
          setOpenPicker(null);
        }}
        onToggle={() =>
          setOpenPicker((current) =>
            current === "model" ? null : "model",
          )
        }
        positionClassName={pickerMenuPositionClassName}
        selectedModelId={resolvedSelectedModel}
      />

      {showEffortPicker && resolvedModelOption && resolvedSelectedEffort ? (
        <EffortPicker
          compact={usesCompactControls}
          efforts={resolvedModelOption.efforts}
          isOpen={openPicker === "effort"}
          onSelect={(effort) => {
            onEffortChange(effort);
            setOpenPicker(null);
          }}
          onToggle={() =>
            setOpenPicker((current) =>
              current === "effort" ? null : "effort",
            )
          }
          positionClassName={pickerMenuPositionClassName}
          selectedEffort={resolvedSelectedEffort}
        />
      ) : null}
    </div>
  );

  const sendButton = canSend ? (
    <ComposerSendButton
      compact={usesCompactControls}
      onClick={() => {
        void onSend();
      }}
    />
  ) : null;

  return (
    <footer className="relative z-10">
      <div className={composerShellClassName}>
        {isChildPane ? (
          <div className="flex w-full min-w-0 items-end gap-2 px-4 py-3">
            <textarea
              ref={textareaRef}
              aria-label={`Message ${title}`}
              autoFocus
              rows={1}
              className={textareaClassName}
              placeholder={placeholder}
              value={composer}
              onChange={(event) => onComposerChange(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            {controls}
            {sendButton}
          </div>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              aria-label={`Message ${title}`}
              autoFocus
              rows={1}
              className={textareaClassName}
              placeholder={placeholder}
              value={composer}
              onChange={(event) => onComposerChange(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div
              className={[
                "flex items-center justify-between gap-3",
                isFixedPane ? "px-3 py-2" : "px-0 py-2",
              ].join(" ")}
            >
              {controls}
              {sendButton}
            </div>
          </>
        )}
      </div>
    </footer>
  );
}

export default ChatWindowComposer;
