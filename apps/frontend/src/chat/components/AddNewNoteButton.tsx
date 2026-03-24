import { Button } from "../../components/ui/button";

interface AddNewNoteButtonProps {
  onClick: () => void;
}

function AddNewNoteButton({ onClick }: AddNewNoteButtonProps) {
  return (
    <Button
      aria-label="Add new note"
      className="absolute left-1/2 top-4 z-30 -translate-x-1/2 cursor-pointer bg-transparent p-0 shadow-none transition-transform duration-200 hover:-translate-x-1/2 hover:-translate-y-0.5 hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
      variant="ghost"
      type="button"
      onClick={onClick}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <img
        alt=""
        className="h-9 w-auto max-w-none select-none"
        draggable={false}
        src="/new-note.png"
      />
    </Button>
  );
}

export default AddNewNoteButton;
