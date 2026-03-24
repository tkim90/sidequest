import { cn } from "../../../lib/utils";

interface PickerMenuOption {
  id: string;
  label: string;
}

interface PickerMenuProps {
  className?: string;
  compact: boolean;
  onSelect: (id: string) => void;
  options: PickerMenuOption[];
  positionClassName: string;
  selectedClassName?: string;
  selectedId: string;
}

function PickerMenu({
  className,
  compact,
  onSelect,
  options,
  positionClassName,
  selectedClassName = "bg-accent font-medium text-primary-foreground",
  selectedId,
}: PickerMenuProps) {
  const itemTextClassName = compact ? "text-xs" : "text-[18px]";

  return (
    <div
      className={cn(
        "absolute bottom-full z-50 mb-1 min-w-[180px] rounded-lg border border-border bg-popover py-1 shadow-lg",
        positionClassName,
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cn(
            "w-full cursor-pointer px-3 py-2 text-left text-popover-foreground hover:bg-accent hover:text-accent-foreground",
            itemTextClassName,
            option.id === selectedId && selectedClassName,
          )}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default PickerMenu;
export type { PickerMenuOption };
