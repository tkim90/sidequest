import { Button } from "../../../components/ui/button";
import CloseIcon from "../shared/CloseIcon";
import StackedNotesIcon from "./StackedNotesIcon";

interface MobileNotesToolbarProps {
  hasNotes: boolean;
  isNotesOpen: boolean;
  onAddNote: () => void;
  onCloseNotes: () => void;
  onOpenNotes: () => void;
}

const TOOLBAR_BUTTON_CLASS_NAME = [
  "h-11 w-11 rounded-full border border-border bg-paper-sheet/90",
  "text-foreground shadow-[0_10px_30px_rgba(50,33,18,0.12)] backdrop-blur-sm",
  "transition-transform duration-200 hover:-translate-y-0.5 hover:bg-paper-sheet",
].join(" ");

function MobileNotesToolbar({
  hasNotes,
  isNotesOpen,
  onAddNote,
  onCloseNotes,
  onOpenNotes,
}: MobileNotesToolbarProps) {
  const showSecondaryButton = hasNotes || isNotesOpen;

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>): void {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      className="fixed right-4 top-4 z-[60] flex items-center gap-2"
      data-mobile-notes-toolbar="true"
    >
      <Button
        aria-label="Add new note"
        className={[TOOLBAR_BUTTON_CLASS_NAME, "text-[28px] font-normal leading-none"].join(" ")}
        size="icon"
        type="button"
        variant="ghost"
        onClick={onAddNote}
        onPointerDown={handlePointerDown}
      >
        <span aria-hidden>+</span>
      </Button>

      {showSecondaryButton ? (
        <Button
          aria-label={isNotesOpen ? "Close notes" : "View notes"}
          className={TOOLBAR_BUTTON_CLASS_NAME}
          size="icon"
          type="button"
          variant="ghost"
          onClick={isNotesOpen ? onCloseNotes : onOpenNotes}
          onPointerDown={handlePointerDown}
        >
          {isNotesOpen ? <CloseIcon /> : <StackedNotesIcon />}
        </Button>
      ) : null}
    </div>
  );
}

export default MobileNotesToolbar;
