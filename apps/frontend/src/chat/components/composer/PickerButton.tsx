import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import ChevronIcon from "../shared/ChevronIcon";

interface PickerButtonProps {
  compact: boolean;
  isOpen: boolean;
  label: string;
  maxLabelWidth?: string;
  onClick: () => void;
}

function PickerButton({
  compact,
  isOpen,
  label,
  maxLabelWidth,
  onClick,
}: PickerButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "flex items-center text-muted-foreground transition-colors hover:bg-paper-sheet hover:text-foreground disabled:opacity-50 disabled:hover:bg-transparent",
        compact ? "h-8 gap-1.5 px-2 text-xs" : "gap-2 px-3 py-2 text-[18px]",
      )}
      onClick={onClick}
    >
      <span className={cn("truncate", maxLabelWidth)}>
        {label}
      </span>
      <ChevronIcon
        className={cn(
          "transition-transform",
          compact ? "h-3.5 w-3.5" : "h-5 w-5",
          isOpen && "rotate-180",
        )}
      />
    </Button>
  );
}

export default PickerButton;
