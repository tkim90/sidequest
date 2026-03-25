import { createPortal } from "react-dom";
import { useState } from "react";

import type { ChatModelOption, ReasoningEffort } from "../../../types";
import { cn } from "../../../lib/utils";
import ChevronIcon from "../shared/ChevronIcon";
import PickerButton from "./PickerButton";

const EFFORT_DOT_COLOR_CLASS = "bg-[#564B3D]/50";

function getEffortLabel(effort: ReasoningEffort): string {
  if (effort === "none") {
    return "None";
  }
  return `${effort}`;
}

function effortToDotCount(
  model: ChatModelOption | undefined,
  selectedEffort: ReasoningEffort | null,
): number {
  if (!model || model.efforts.length === 0) {
    return 0;
  }
  if (selectedEffort === null || selectedEffort === "none") {
    return 0;
  }
  switch (selectedEffort) {
    case "minimal":
      return 1;
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "xhigh":
      return 3;
    default:
      return 0;
  }
}

function EffortDots({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      aria-hidden
      className="ml-1 flex shrink-0 items-center gap-0.5"
      title="Reasoning effort"
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={cn("h-1.5 w-1.5 rounded-full", EFFORT_DOT_COLOR_CLASS)}
        />
      ))}
    </span>
  );
}

interface ModelPickerProps {
  compact: boolean;
  isOpen: boolean;
  models: ChatModelOption[];
  onModelEffortSelect: (modelId: string, effort: ReasoningEffort) => void;
  onModelRowSelect: (modelId: string) => void;
  onToggle: () => void;
  positionClassName: string;
  selectedEffort: ReasoningEffort | null;
  selectedModelId: string;
}

function ModelPicker({
  compact,
  isOpen,
  models,
  onModelEffortSelect,
  onModelRowSelect,
  onToggle,
  positionClassName,
  selectedEffort,
  selectedModelId,
}: ModelPickerProps) {
  const [hoveredModelId, setHoveredModelId] = useState<string | null>(null);
  const [effortMenuFixed, setEffortMenuFixed] = useState<{
    left: number;
    top: number;
  } | null>(null);

  if (models.length === 0) {
    return null;
  }

  const itemTextClassName = compact ? "text-xs" : "text-[18px]";
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const effortDotCount = effortToDotCount(selectedModel, selectedEffort);
  const triggerLabelMaxWidth = compact
    ? "max-w-[min(320px,55vw)]"
    : "max-w-[min(36rem,85vw)]";

  const hoveredModel =
    hoveredModelId !== null
      ? models.find((m) => m.id === hoveredModelId)
      : null;
  const effortPortalContent =
    isOpen &&
    hoveredModel &&
    hoveredModel.efforts.length > 0 &&
    effortMenuFixed !== null ? (
      <div
        className="fixed z-[9999] min-w-[160px] rounded-lg border border-border bg-popover py-1 shadow-lg"
        data-model-picker-effort-submenu=""
        style={{
          left: effortMenuFixed.left,
          top: effortMenuFixed.top,
        }}
        onMouseEnter={() => {
          setHoveredModelId(hoveredModel.id);
        }}
        onMouseLeave={() => {
          setHoveredModelId(null);
          setEffortMenuFixed(null);
        }}
      >
        {hoveredModel.efforts.map((effort) => {
          const isSelectedEffort =
            hoveredModel.id === selectedModelId &&
            selectedEffort !== null &&
            effort === selectedEffort;

          return (
            <button
              key={effort}
              type="button"
              className={cn(
                "w-full cursor-pointer px-3 py-2 text-left text-popover-foreground hover:bg-accent hover:text-accent-foreground",
                itemTextClassName,
                isSelectedEffort &&
                  "bg-accent font-medium text-white hover:text-white",
              )}
              onClick={(event) => {
                event.stopPropagation();
                onModelEffortSelect(hoveredModel.id, effort);
              }}
            >
              {getEffortLabel(effort)}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div className="relative z-[500] min-w-0">
      <PickerButton
        afterLabel={<EffortDots count={effortDotCount} />}
        compact={compact}
        isOpen={isOpen}
        label={selectedModelId}
        maxLabelWidth={triggerLabelMaxWidth}
        onClick={onToggle}
      />
      {isOpen ? (
        <div
          className={cn(
            "absolute bottom-full z-[600] mb-1 w-max min-w-[min(200px,80vw)] max-w-[min(260px,92vw)] overflow-visible rounded-lg border border-border bg-popover py-1 shadow-lg",
            positionClassName,
          )}
        >
          {models.map((model) => {
            const hasEfforts = model.efforts.length > 0;
            const isSelectedModel = model.id === selectedModelId;

            return (
              <div
                key={model.id}
                className="relative"
                onMouseEnter={(event) => {
                  setHoveredModelId(model.id);
                  if (model.efforts.length > 0) {
                    const row = event.currentTarget.getBoundingClientRect();
                    setEffortMenuFixed({
                      left: row.right - 6,
                      top: row.top,
                    });
                  } else {
                    setEffortMenuFixed(null);
                  }
                }}
                onMouseLeave={(event) => {
                  const related = event.relatedTarget;
                  if (
                    related instanceof Element &&
                    related.closest("[data-model-picker-effort-submenu]")
                  ) {
                    return;
                  }
                  setHoveredModelId((current) =>
                    current === model.id ? null : current,
                  );
                  setEffortMenuFixed(null);
                }}
              >
                <button
                  type="button"
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-popover-foreground hover:bg-accent hover:text-accent-foreground",
                    itemTextClassName,
                    isSelectedModel &&
                      "bg-accent font-medium text-primary-foreground hover:text-primary-foreground",
                  )}
                  onClick={() => {
                    onModelRowSelect(model.id);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{model.id}</span>
                  {hasEfforts ? (
                    <ChevronIcon
                      aria-hidden
                      className={cn(
                        "shrink-0 rotate-[-90deg] text-muted-foreground",
                        compact ? "h-3 w-3" : "h-4 w-4",
                      )}
                    />
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
      {effortPortalContent !== null
        ? createPortal(effortPortalContent, document.body)
        : null}
    </div>
  );
}

export default ModelPicker;
export { getEffortLabel };
