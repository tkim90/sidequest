import { useEffect, useMemo, useRef, useState } from "react";
import { Highlight, themes } from "prism-react-renderer";

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
  highlightLines?: number[];
  variables?: Record<string, string>;
}

interface StepperExample {
  label: string;
  title?: string;
  description?: string;
  code?: string;
  language?: string;
  steps: Step[];
}

interface AlgorithmStepperProps {
  title: string;
  steps: Step[];
  description?: string;
  code?: string;
  language?: string;
  examples?: StepperExample[];
  autoPlayDelayMs?: number;
}

interface StepperScenario {
  label?: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  steps: Step[];
}

const DEFAULT_PLAYBACK_DELAY_MS = 900;

function buildFallbackCode(sourceSteps: Step[]): string {
  return sourceSteps
    .map((step, index) => `step_${index + 1}: ${step.label}`)
    .join("\n");
}

export default function AlgorithmStepper({
  title,
  steps,
  description,
  code,
  language,
  examples,
  autoPlayDelayMs = DEFAULT_PLAYBACK_DELAY_MS,
}: AlgorithmStepperProps) {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeExampleIndex, setActiveExampleIndex] = useState<number | null>(null);
  const codeContainerRef = useRef<HTMLPreElement | null>(null);

  const baseCode = code && code.trim().length > 0 ? code : buildFallbackCode(steps);
  const baseLanguage = code && code.trim().length > 0 ? (language ?? "javascript") : "text";

  const baseScenario = useMemo<StepperScenario>(
    () => ({
      label: "Current",
      title,
      description,
      code: baseCode,
      language: baseLanguage,
      steps,
    }),
    [title, description, baseCode, baseLanguage, steps],
  );

  const fallbackExamples = useMemo<StepperScenario[]>(() => {
    if (!steps || steps.length === 0) {
      return [];
    }

    const shortLength = Math.max(1, Math.min(6, Math.ceil(steps.length / 3)));
    const simpleSteps = steps.slice(0, shortLength);
    return [
      {
        label: "Simple",
        title,
        description: "Simple run with fewer iterations",
        code: code && code.trim().length > 0 ? code : buildFallbackCode(simpleSteps),
        language: code && code.trim().length > 0 ? (language ?? "javascript") : "text",
        steps: simpleSteps,
      },
      {
        label: "Larger",
        title,
        description: "Slightly larger run with full iteration history",
        code: baseCode,
        language: baseLanguage,
        steps,
      },
    ];
  }, [title, code, language, baseCode, baseLanguage, steps]);

  const providedExamples = useMemo<StepperScenario[]>(
    () =>
      (examples ?? [])
        .filter((example) => Array.isArray(example.steps) && example.steps.length > 0)
        .map((example) => {
          const exampleCode =
            example.code && example.code.trim().length > 0
              ? example.code
              : buildFallbackCode(example.steps);
          const exampleLanguage =
            example.code && example.code.trim().length > 0
              ? (example.language ?? language ?? "javascript")
              : "text";

          return {
            label: example.label,
            title: example.title ?? title,
            description: example.description,
            code: exampleCode,
            language: exampleLanguage,
            steps: example.steps,
          };
        }),
    [examples, title, language],
  );

  const selectableExamples = providedExamples.length > 0 ? providedExamples : fallbackExamples;

  const activeScenario =
    activeExampleIndex === null
      ? baseScenario
      : selectableExamples[activeExampleIndex] ?? baseScenario;

  const totalSteps = activeScenario.steps.length;
  const maxIndex = Math.max(totalSteps - 1, 0);
  const currentIndex = Math.min(current, maxIndex);
  const step = activeScenario.steps[currentIndex] ?? { label: "Waiting for steps" };
  const playbackDelayMs = Math.max(250, autoPlayDelayMs);

  useEffect(() => {
    setCurrent(0);
    setIsPlaying(false);
  }, [activeExampleIndex, activeScenario]);

  useEffect(() => {
    setCurrent((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    if (currentIndex >= maxIndex) {
      setIsPlaying(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCurrent((prev) => Math.min(prev + 1, maxIndex));
    }, playbackDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [currentIndex, isPlaying, maxIndex, playbackDelayMs]);

  const codeLineCount = activeScenario.code.split(/\r?\n/).length;
  const highlightLines =
    step.highlightLines && step.highlightLines.length > 0
      ? step.highlightLines
      : [Math.min(currentIndex + 1, codeLineCount)];
  const highlightLineSet = new Set(highlightLines);

  useEffect(() => {
    const container = codeContainerRef.current;
    if (!container) {
      return;
    }

    const activeLine = container.querySelector<HTMLElement>("[data-active-line='true']");
    if (activeLine) {
      activeLine.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [currentIndex, activeScenario.code]);

  if (!steps || steps.length === 0 || totalSteps === 0) {
    return (
      <div
        className={`${surfaceClass} p-4`}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <p className={titleClass}>{title}</p>
        <div className="mt-3 flex h-40 animate-pulse items-center justify-center rounded-lg border border-border bg-secondary">
          <span className="text-sm text-muted-foreground">Loading Stepper...</span>
        </div>
      </div>
    );
  }

  const togglePlay = () => {
    if (currentIndex >= maxIndex) {
      setCurrent(0);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((prev) => !prev);
  };

  const goPrev = () => {
    setIsPlaying(false);
    setCurrent((prev) => Math.max(prev - 1, 0));
  };

  const goNext = () => {
    setIsPlaying(false);
    setCurrent((prev) => Math.min(prev + 1, maxIndex));
  };

  return (
    <div
      className={`${surfaceClass} overflow-hidden`}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div className="border-b border-border px-4 py-3">
        <p className={titleClass}>{activeScenario.title}</p>
        {(activeScenario.description || description) && (
          <p className={`mt-1 ${captionTextClass}`}>{activeScenario.description ?? description}</p>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className={`${insetSurfaceClass} flex flex-wrap items-center gap-2 px-3 py-2`}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Examples</span>
          {selectableExamples.map((example, index) => {
            const label = example.label || (index === 0 ? "Simple" : "Larger");
            const isActive = activeExampleIndex === index;
            return (
              <button
                key={`${label}-${index}`}
                type="button"
                onClick={() => setActiveExampleIndex(index)}
                className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setActiveExampleIndex(null)}
            className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
              activeExampleIndex === null
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            Reset
          </button>
        </div>

        <div className={`${insetSurfaceClass} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Code</p>
            <p className="text-xs font-medium text-muted-foreground">{activeScenario.language}</p>
          </div>
          <Highlight theme={themes.github} code={activeScenario.code} language={activeScenario.language}>
            {({ tokens, getLineProps, getTokenProps }) => (
              <pre
                ref={codeContainerRef}
                className="max-h-72 overflow-auto py-2 text-xs leading-5 font-mono"
                style={{ background: "transparent" }}
              >
                <code>
                  {tokens.map((line, lineIndex) => {
                    const lineNum = lineIndex + 1;
                    const isHighlighted = highlightLineSet.has(lineNum);
                    const lineProps = getLineProps({ line });
                    return (
                      <div
                        key={lineIndex}
                        {...lineProps}
                        data-active-line={isHighlighted ? "true" : undefined}
                        className={`flex items-start gap-3 px-3 py-0.5 transition-colors ${
                          isHighlighted ? "bg-primary/20 shadow-[inset_3px_0_0_0_var(--primary)]" : ""
                        }`}
                      >
                        <span className="inline-block w-7 shrink-0 select-none text-right text-[11px] text-muted-foreground/80">
                          {lineNum}
                        </span>
                        <span className="flex-1">
                          {line.map((token, tokenIndex) => (
                            <span key={tokenIndex} {...getTokenProps({ token })} />
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </code>
              </pre>
            )}
          </Highlight>
        </div>

        <div className={`${insetSurfaceClass} overflow-hidden`}>
          <div className="border-b border-border px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Visualizer</p>
          </div>
          <div className="space-y-3 p-4">
            <p className="text-sm font-medium text-foreground">
              Step {currentIndex + 1} of {totalSteps}: {step.label}
            </p>
            {step.description && <p className={captionTextClass}>{step.description}</p>}
            {step.highlight && (
              <pre className="overflow-x-auto rounded-lg border border-border bg-card/80 p-3 font-mono text-xs text-foreground">
                {step.highlight}
              </pre>
            )}

            {step.variables && Object.keys(step.variables).length > 0 && (
              <div className="rounded-md border border-border/80 bg-card/80 p-2">
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
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/70 px-3 py-2">
          <button type="button" onClick={togglePlay} className={primaryButtonClass}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className={secondaryButtonClass}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={currentIndex === maxIndex}
            className={secondaryButtonClass}
          >
            Next
          </button>
          <input
            type="range"
            min={0}
            max={maxIndex}
            value={currentIndex}
            onChange={(event) => {
              setIsPlaying(false);
              setCurrent(Number(event.target.value));
            }}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary"
            aria-label="Iteration slider"
          />
          <span className="w-20 text-right font-mono text-xs text-muted-foreground">
            {currentIndex + 1} / {totalSteps}
          </span>
          <span className="w-14 text-right text-xs text-muted-foreground">
            {(playbackDelayMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  );
}
