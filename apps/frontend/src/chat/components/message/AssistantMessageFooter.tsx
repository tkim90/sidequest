import { Button } from "../../../components/ui/button";
import RetryIcon from "../shared/RetryIcon";

interface AssistantMessageFooterProps {
  isComplete: boolean;
  model: string | undefined;
  onRetry: () => void;
}

export default function AssistantMessageFooter({
  isComplete,
  model,
  onRetry,
}: AssistantMessageFooterProps) {
  return (
    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
      {isComplete ? (
        <Button
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-ring hover:text-foreground bg-paper-raised/80"
          title="Retry"
          variant="ghost"
          size="icon"
          type="button"
          onClick={onRetry}
        >
          <RetryIcon />
        </Button>
      ) : null}
      {model ? (
        <span
          className="inline-flex h-6 items-center border border-border px-3 text-[14px] font-medium tracking-tight text-muted-foreground rounded font-sans bg-paper-raised/80"
        >
          {model}
        </span>
      ) : null}
    </div>
  );
}
