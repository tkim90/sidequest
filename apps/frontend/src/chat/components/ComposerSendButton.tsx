import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import SendIcon from "./SendIcon";

interface ComposerSendButtonProps {
  compact: boolean;
  onClick: () => void;
}

function ComposerSendButton({ compact, onClick }: ComposerSendButtonProps) {
  return (
    <Button
      aria-label="Send message"
      type="button"
      variant="default"
      className={cn(
        "shrink-0 rounded-full border-none bg-primary text-primary-foreground transition-opacity hover:-translate-y-0 hover:bg-primary hover:opacity-80",
        compact ? "h-9 w-9" : "h-12 w-12",
      )}
      onClick={onClick}
    >
      <SendIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
    </Button>
  );
}

export default ComposerSendButton;
