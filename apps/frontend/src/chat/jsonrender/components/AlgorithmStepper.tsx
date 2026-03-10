import { useState } from "react";

import {
  captionTextClass,
  insetSurfaceClass,
  primaryButtonClass,
  secondaryButtonClass,
  surfaceClass,
  titleClass,
} from "../theme";

interface Step {
  label: string;
  description?: string;
  highlight?: string;
  variables?: Record<string, string>;
}

interface AlgorithmStepperProps {
  title: string;
  steps: Step[];
  description?: string;
}

export default function AlgorithmStepper({ title, steps, description }: AlgorithmStepperProps) {
  const [current, setCurrent] = useState(0);

  if (!steps || steps.length === 0) return null;

  const step = steps[current];

  return (
    <div
      className={`${surfaceClass} p-4`}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <p className={titleClass}>{title}</p>
      {description && <p className={`mt-1 ${captionTextClass}`}>{description}</p>}

      <div className={`${insetSurfaceClass} mt-3 p-3`}>
        <p className="text-xs font-medium text-foreground">
          Step {current + 1} of {steps.length}: {step.label}
        </p>
        {step.description && (
          <p className={`mt-1 ${captionTextClass}`}>{step.description}</p>
        )}
        {step.highlight && (
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-popover p-2 font-mono text-xs text-popover-foreground">
            {step.highlight}
          </pre>
        )}
        {step.variables && Object.keys(step.variables).length > 0 && (
          <div className="mt-2 rounded-lg border border-border bg-popover p-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Variables</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(step.variables).map(([name, value]) => (
                <span key={name} className="font-mono text-xs">
                  <span className="font-semibold text-foreground">{name}</span>
                  <span className="text-muted-foreground"> = </span>
                  <span className="text-primary">{value}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="mt-3 flex items-center gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === current
                ? "w-4 border border-primary bg-primary"
                : i < current
                  ? "w-2 border border-success bg-success"
                  : "w-2 border border-border bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className={secondaryButtonClass}
        >
          Prev
        </button>
        <button
          onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
          disabled={current === steps.length - 1}
          className={primaryButtonClass}
        >
          Next
        </button>
      </div>
    </div>
  );
}
