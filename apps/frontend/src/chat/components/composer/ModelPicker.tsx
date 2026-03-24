import type { ChatModelOption } from "../../../types";
import PickerButton from "./PickerButton";
import PickerMenu from "./PickerMenu";

interface ModelPickerProps {
  compact: boolean;
  isOpen: boolean;
  models: ChatModelOption[];
  onSelect: (modelId: string) => void;
  onToggle: () => void;
  positionClassName: string;
  selectedModelId: string;
}

function ModelPicker({
  compact,
  isOpen,
  models,
  onSelect,
  onToggle,
  positionClassName,
  selectedModelId,
}: ModelPickerProps) {
  if (models.length === 0) {
    return null;
  }

  const options = models.map((model) => ({
    id: model.id,
    label: model.id,
  }));

  return (
    <div className="relative">
      <PickerButton
        compact={compact}
        isOpen={isOpen}
        label={selectedModelId}
        maxLabelWidth={compact ? "max-w-[120px]" : "max-w-[200px]"}
        onClick={onToggle}
      />
      {isOpen ? (
        <PickerMenu
          className="min-w-[200px]"
          compact={compact}
          onSelect={onSelect}
          options={options}
          positionClassName={positionClassName}
          selectedId={selectedModelId}
        />
      ) : null}
    </div>
  );
}

export default ModelPicker;
