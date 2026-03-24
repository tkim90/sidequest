import type { ChatModelOption, ReasoningEffort } from "../../types";
import PickerButton from "./PickerButton";
import PickerMenu from "./PickerMenu";

function getEffortLabel(effort: ReasoningEffort): string {
  return effort === "none" ? "" : `${effort}`;
}

interface EffortPickerProps {
  compact: boolean;
  efforts: ChatModelOption["efforts"];
  isOpen: boolean;
  onSelect: (effort: ReasoningEffort) => void;
  onToggle: () => void;
  positionClassName: string;
  selectedEffort: ReasoningEffort;
}

function EffortPicker({
  compact,
  efforts,
  isOpen,
  onSelect,
  onToggle,
  positionClassName,
  selectedEffort,
}: EffortPickerProps) {
  const options = efforts.map((effort) => ({
    id: effort,
    label: getEffortLabel(effort),
  }));

  return (
    <div className="relative">
      <PickerButton
        compact={compact}
        isOpen={isOpen}
        label={getEffortLabel(selectedEffort)}
        maxLabelWidth={compact ? "max-w-[96px]" : "max-w-[160px]"}
        onClick={onToggle}
      />
      {isOpen ? (
        <PickerMenu
          compact={compact}
          onSelect={(id) => onSelect(id as ReasoningEffort)}
          options={options}
          positionClassName={positionClassName}
          selectedClassName="bg-accent font-medium text-white hover:text-white"
          selectedId={selectedEffort}
        />
      ) : null}
    </div>
  );
}

export default EffortPicker;
export { getEffortLabel };
