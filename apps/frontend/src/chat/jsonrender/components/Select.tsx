import { useState, useRef, useEffect } from "react";
import { labelTextClass, insetSurfaceClass } from "../theme";

interface OptionObj {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  options: string[] | OptionObj[];
  placeholder?: string;
  defaultValue?: string;
}

function normalizeOptions(options: string[] | OptionObj[]): OptionObj[] {
  if (!options || options.length === 0) return [];
  if (typeof options[0] === "string") {
    return (options as string[]).map((s) => ({ label: s, value: s }));
  }
  return options as OptionObj[];
}

export default function Select({
  label,
  options,
  placeholder = "Select...",
  defaultValue,
}: SelectProps) {
  const normalized = normalizeOptions(options);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(defaultValue ?? null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedLabel =
    normalized.find((o) => o.value === selected)?.label ?? null;

  return (
    <div
      ref={ref}
      className="relative flex flex-col gap-1"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {label && <span className={labelTextClass}>{label}</span>}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`${insetSurfaceClass} flex items-center justify-between px-3 py-1.5 text-sm text-left`}
      >
        <span className={selectedLabel ? "" : "text-muted-foreground"}>
          {selectedLabel ?? placeholder}
        </span>
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-lg border border-border bg-popover shadow-md">
          {normalized.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setSelected(opt.value);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                opt.value === selected
                  ? "bg-accent text-accent-foreground"
                  : "text-popover-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
