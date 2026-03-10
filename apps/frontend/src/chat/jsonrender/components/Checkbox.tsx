import { useState } from "react";
import { labelTextClass } from "../theme";

interface CheckboxProps {
  label: string;
  defaultChecked?: boolean;
}

export default function Checkbox({
  label,
  defaultChecked = false,
}: CheckboxProps) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label
      className="flex items-center gap-2 cursor-pointer select-none"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <button
        role="checkbox"
        aria-checked={checked}
        onClick={() => setChecked((v) => !v)}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          checked
            ? "border-primary bg-primary"
            : "border-border bg-secondary"
        }`}
      >
        {checked && (
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 6l2.5 2.5 4.5-5" />
          </svg>
        )}
      </button>
      <span className={labelTextClass}>{label}</span>
    </label>
  );
}
