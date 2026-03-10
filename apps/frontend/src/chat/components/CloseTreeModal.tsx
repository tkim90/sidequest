import type { ClosePrompt } from "../../types";
import {
  eyebrowClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./ui";

interface CloseTreeModalProps {
  closePrompt: ClosePrompt;
  onCancel: () => void;
  onConfirm: () => void;
}

function CloseTreeModal({
  closePrompt,
  onCancel,
  onConfirm,
}: CloseTreeModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/35 p-4">
      <div className="w-[min(92vw,520px)] border border-border bg-card p-6 shadow-[var(--modal-shadow)]">
        <p className={eyebrowClassName}>{closePrompt.eyebrow}</p>
        <h2 className="mt-2 text-3xl font-medium tracking-tight text-foreground">
          {closePrompt.title}
        </h2>
        {closePrompt.windowTitles.length > 0 ? (
          <ul className="mt-5 list-disc pl-5 text-sm leading-6 text-muted-foreground">
            {closePrompt.windowTitles.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className={secondaryButtonClassName}
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={primaryButtonClassName}
            type="button"
            onClick={onConfirm}
          >
            {closePrompt.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CloseTreeModal;
