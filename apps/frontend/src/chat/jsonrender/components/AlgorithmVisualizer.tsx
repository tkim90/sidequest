import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Highlight, themes } from "prism-react-renderer";

import {
  captionTextClass,
  insetSurfaceClass,
  primaryButtonClass,
  secondaryButtonClass,
  surfaceClass,
  titleClass,
} from "../theme";

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  shape?: "circle" | "rect" | "diamond";
}

interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

interface Step {
  label: string;
  description?: string;
  highlightLines?: number[];
  highlightNodes?: string[];
  highlightEdges?: [string, string][];
  nodeAnnotations?: Record<string, string>;
  variables?: Record<string, string>;
  lineAnnotations?: Record<number, string>;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface VisualizerExample {
  label?: string;
  title?: string;
  description?: string;
  code?: string;
  language?: string;
  graph?: GraphData;
  steps: Step[];
}

interface AlgorithmVisualizerProps {
  title?: string;
  description?: string;
  code?: string;
  language?: string;
  graph?: GraphData;
  steps?: Step[];
  examples?: VisualizerExample[];
  autoPlayDelayMs?: number;
}

interface VisualizerScenario {
  label?: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  graph: GraphData;
  steps: Step[];
}

const NODE_RADIUS = 30;
const RECT_W = 80;
const RECT_H = 50;
const DIAMOND_R = 35;
const DEFAULT_PLAYBACK_DELAY_MS = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildFallbackCode(sourceSteps: Step[]): string {
  return sourceSteps
    .map((step, index) => `step_${index + 1}: ${step.label}`)
    .join("\n");
}

function normalizeGraph(graph: GraphData | undefined): GraphData {
  return {
    nodes: Array.isArray(graph?.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph?.edges) ? graph.edges : [],
  };
}

function normalizeStringRecord(
  value: unknown,
): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, String(entryValue)]),
  );
}

function getBoundaryPoint(
  node: GraphNode,
  targetX: number,
  targetY: number,
): [number, number] {
  const dx = targetX - node.x;
  const dy = targetY - node.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return [node.x, node.y];
  const nx = dx / dist;
  const ny = dy / dist;
  const shape = node.shape ?? "circle";

  if (shape === "circle") {
    return [node.x + nx * NODE_RADIUS, node.y + ny * NODE_RADIUS];
  }

  if (shape === "rect") {
    const hw = RECT_W / 2;
    const hh = RECT_H / 2;
    const sx = Math.abs(nx) > 0 ? hw / Math.abs(nx) : Infinity;
    const sy = Math.abs(ny) > 0 ? hh / Math.abs(ny) : Infinity;
    const s = Math.min(sx, sy);
    return [node.x + nx * s, node.y + ny * s];
  }

  // diamond
  const abx = Math.abs(nx);
  const aby = Math.abs(ny);
  const sum = abx + aby || 1;
  const s = DIAMOND_R / sum;
  return [node.x + nx * s, node.y + ny * s];
}

export default function AlgorithmVisualizer({
  title,
  description,
  code,
  language = "javascript",
  graph,
  steps,
  examples,
  autoPlayDelayMs = DEFAULT_PLAYBACK_DELAY_MS,
}: AlgorithmVisualizerProps) {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeExampleIndex, setActiveExampleIndex] = useState<number | null>(null);
  const codeContainerRef = useRef<HTMLPreElement | null>(null);
  const markerSeed = useId().replaceAll(":", "");

  const baseSteps = useMemo<Step[]>(() => (Array.isArray(steps) ? steps : []), [steps]);
  const hasExplicitCode = typeof code === "string" && code.trim().length > 0;
  const baseCode = hasExplicitCode ? code : buildFallbackCode(baseSteps);
  const baseLanguage =
    hasExplicitCode && typeof language === "string" && language.trim().length > 0
      ? language
      : hasExplicitCode
        ? "javascript"
        : "text";
  const baseGraph = useMemo(() => normalizeGraph(graph), [graph]);
  const baseTitle = typeof title === "string" ? title : "Algorithm Visualizer";
  const baseDescription = typeof description === "string" ? description : undefined;

  const baseScenario = useMemo<VisualizerScenario>(
    () => ({
      label: "Current",
      title: baseTitle,
      description: baseDescription,
      code: baseCode,
      language: baseLanguage,
      graph: baseGraph,
      steps: baseSteps,
    }),
    [baseCode, baseDescription, baseGraph, baseLanguage, baseSteps, baseTitle],
  );

  const fallbackExamples = useMemo<VisualizerScenario[]>(() => {
    if (baseSteps.length === 0) {
      return [];
    }

    const shortLength = Math.max(1, Math.min(6, Math.ceil(baseSteps.length / 3)));
    const simpleSteps = baseSteps.slice(0, shortLength);
    return [
      {
        label: "Simple",
        title: baseTitle,
        description: "Simple run with fewer iterations",
        code: hasExplicitCode ? baseCode : buildFallbackCode(simpleSteps),
        language: hasExplicitCode ? baseLanguage : "text",
        graph: baseGraph,
        steps: simpleSteps,
      },
      {
        label: "Larger",
        title: baseTitle,
        description: "Slightly larger run with full iteration history",
        code: baseCode,
        language: baseLanguage,
        graph: baseGraph,
        steps: baseSteps,
      },
    ];
  }, [baseCode, baseGraph, baseLanguage, baseSteps, baseTitle, hasExplicitCode]);

  const providedExamples = useMemo<VisualizerScenario[]>(
    () =>
      (examples ?? [])
        .flatMap((example) => {
          const exampleSteps = Array.isArray(example.steps) ? example.steps : [];
          if (exampleSteps.length === 0) {
            return [];
          }

          const explicitExampleCode =
            typeof example.code === "string" && example.code.trim().length > 0
              ? example.code
              : null;
          const exampleCode = explicitExampleCode ?? buildFallbackCode(exampleSteps);
          const label = typeof example.label === "string" ? example.label : undefined;

          return [
            {
              ...(label ? { label } : {}),
              title: example.title ?? baseTitle,
              description: example.description,
              code: exampleCode,
              language:
                explicitExampleCode && typeof example.language === "string"
                  ? example.language
                  : explicitExampleCode
                    ? baseLanguage
                    : "text",
              graph: normalizeGraph(example.graph ?? baseGraph),
              steps: exampleSteps,
            },
          ];
        }),
    [baseGraph, baseLanguage, baseTitle, examples],
  );

  const selectableExamples = providedExamples.length > 0 ? providedExamples : fallbackExamples;

  const effectiveExampleIndex =
    activeExampleIndex ??
    (baseSteps.length === 0 && selectableExamples.length > 0 ? 0 : null);

  const activeScenario =
    effectiveExampleIndex === null
      ? baseScenario
      : selectableExamples[effectiveExampleIndex] ?? baseScenario;

  const activeSteps = Array.isArray(activeScenario.steps) ? activeScenario.steps : [];
  const totalSteps = activeSteps.length;
  const maxIndex = Math.max(totalSteps - 1, 0);
  const currentIndex = Math.min(current, maxIndex);
  const playbackDelayMs = Math.max(250, autoPlayDelayMs);

  useEffect(() => {
    setCurrent(0);
    setIsPlaying(false);
  }, [effectiveExampleIndex]);

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

  const step = activeSteps[currentIndex] ?? { label: "Waiting for steps" };
  const stepLabel =
    typeof step.label === "string" && step.label.length > 0
      ? step.label
      : `Step ${currentIndex + 1}`;
  const stepDescription =
    typeof step.description === "string" ? step.description : undefined;
  const stepLineAnnotations = normalizeStringRecord(step.lineAnnotations);
  const stepNodeAnnotations = normalizeStringRecord(step.nodeAnnotations);
  const stepVariables = normalizeStringRecord(step.variables);

  const codeLineCount = activeScenario.code.split(/\r?\n/).length;
  const stepHighlightLines = Array.isArray(step.highlightLines)
    ? step.highlightLines.filter((line): line is number => Number.isFinite(line))
    : [];
  const highlightLines =
    stepHighlightLines.length > 0
      ? stepHighlightLines
      : [Math.min(currentIndex + 1, codeLineCount)];

  const highlightLineSet = new Set(highlightLines);
  const highlightNodeSet = new Set(
    (Array.isArray(step.highlightNodes) ? step.highlightNodes : []).filter(
      (nodeId): nodeId is string => typeof nodeId === "string",
    ),
  );
  const highlightEdgeSet = new Set(
    (Array.isArray(step.highlightEdges) ? step.highlightEdges : [])
      .filter(
        (edge): edge is [string, string] =>
          Array.isArray(edge) &&
          edge.length === 2 &&
          typeof edge[0] === "string" &&
          typeof edge[1] === "string",
      )
      .map(([from, to]) => `${from}->${to}`),
  );
  const annotations = stepNodeAnnotations ?? {};

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

  if (totalSteps === 0) {
    return (
      <div className={`${surfaceClass} p-4`}>
        {baseTitle && <p className={titleClass}>{baseTitle}</p>}
        <div className="mt-3 flex h-48 animate-pulse items-center justify-center rounded-lg border border-border bg-secondary">
          <span className="text-sm text-muted-foreground">Loading Visualizer...</span>
        </div>
      </div>
    );
  }

  // --- Graph layout ---
  const nodes = (activeScenario.graph.nodes ?? []).map((node, i) => {
    const x = Number(node?.x);
    const y = Number(node?.y);
    const nodeId = typeof node?.id === "string" ? node.id : `node-${i}`;
    const label = typeof node?.label === "string" ? node.label : nodeId;
    const shape =
      node?.shape === "circle" || node?.shape === "rect" || node?.shape === "diamond"
        ? node.shape
        : undefined;

    return {
      ...node,
      id: nodeId,
      label,
      shape,
      x: Number.isFinite(x) ? x : (i % 5) * 120 + 60,
      y: Number.isFinite(y) ? y : Math.floor(i / 5) * 100 + 60,
    };
  });
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges = (activeScenario.graph.edges ?? []).filter(
    (edge): edge is GraphEdge =>
      typeof edge?.from === "string" &&
      typeof edge?.to === "string" &&
      nodeMap.has(edge.from) &&
      nodeMap.has(edge.to),
  );

  const PAD = 60;
  const rawMinX = Math.min(...nodes.map((n) => n.x));
  const rawMinY = Math.min(...nodes.map((n) => n.y));
  const rawMaxX = Math.max(...nodes.map((n) => n.x));
  const rawMaxY = Math.max(...nodes.map((n) => n.y));
  const vbX = Math.floor((rawMinX - PAD) / 50) * 50;
  const vbY = Math.floor((rawMinY - PAD) / 50) * 50;
  const vbW = Math.ceil((rawMaxX + PAD - vbX) / 50) * 50;
  const vbH = Math.ceil((rawMaxY + PAD - vbY) / 50) * 50;

  const arrowMarkerId = `av-arrow-${markerSeed}`;
  const arrowHighlightMarkerId = `av-arrow-hl-${markerSeed}`;

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
        {(activeScenario.description || baseDescription) && (
          <p className={`mt-1 ${captionTextClass}`}>{activeScenario.description ?? baseDescription}</p>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className={`${insetSurfaceClass} flex flex-wrap items-center gap-2 px-3 py-2`}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Examples</span>
          {selectableExamples.map((example, index) => {
            const label = example.label || (index === 0 ? "Simple" : "Larger");
            const isActive = effectiveExampleIndex === index;
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
              effectiveExampleIndex === null
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
                    const lineAnnotation = stepLineAnnotations?.[String(lineNum)];
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
                        {lineAnnotation && (
                          <span className="shrink-0 whitespace-nowrap text-[11px] italic text-primary/70">
                            {`// ${lineAnnotation}`}
                          </span>
                        )}
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Visualization</p>
          </div>
          <div className="space-y-3 p-3">
            <div className="rounded-lg border border-border/70 bg-background/40 p-2">
              {nodes.length > 0 && (
                <svg
                  viewBox={
                    Number.isFinite(vbX + vbY + vbW + vbH)
                      ? `${vbX} ${vbY} ${vbW} ${vbH}`
                      : "0 0 500 300"
                  }
                  className="w-full"
                  style={{ maxHeight: 360 }}
                >
                  <defs>
                    <marker
                      id={arrowMarkerId}
                      viewBox="0 0 10 10"
                      refX="10"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M0,0 L10,5 L0,10 Z" fill="var(--muted-foreground)" />
                    </marker>
                    <marker
                      id={arrowHighlightMarkerId}
                      viewBox="0 0 10 10"
                      refX="10"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M0,0 L10,5 L0,10 Z" fill="var(--primary)" />
                    </marker>
                  </defs>

                  {edges.map((edge, i) => {
                    const fromNode = nodeMap.get(edge.from)!;
                    const toNode = nodeMap.get(edge.to)!;
                    const [x1, y1] = getBoundaryPoint(fromNode, toNode.x, toNode.y);
                    const [x2, y2] = getBoundaryPoint(toNode, fromNode.x, fromNode.y);
                    const isHL = highlightEdgeSet.has(`${edge.from}->${edge.to}`);
                    const color = isHL ? "var(--primary)" : "var(--muted-foreground)";
                    return (
                      <g key={`e-${i}`}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={color}
                          strokeWidth={isHL ? 2.5 : 1.5}
                          markerEnd={isHL ? `url(#${arrowHighlightMarkerId})` : `url(#${arrowMarkerId})`}
                          className="transition-all duration-150"
                        />
                        {edge.label && (
                          <text
                            x={(x1 + x2) / 2}
                            y={(y1 + y2) / 2 - 6}
                            textAnchor="middle"
                            fontSize="11"
                            fill="var(--muted-foreground)"
                          >
                            {edge.label}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {nodes.map((node, i) => {
                    const shape = node.shape ?? "circle";
                    const isHL = highlightNodeSet.has(node.id);
                    const strokeColor = isHL ? "var(--primary)" : "var(--border)";
                    const strokeWidth = isHL ? 2.5 : 1.5;
                    const annotation = annotations[node.id];

                    return (
                      <g key={`node-${node.id}-${i}`} className="transition-all duration-150">
                        {shape === "circle" && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={NODE_RADIUS}
                            fill="var(--card)"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                          />
                        )}
                        {shape === "rect" && (
                          <rect
                            x={node.x - RECT_W / 2}
                            y={node.y - RECT_H / 2}
                            width={RECT_W}
                            height={RECT_H}
                            rx={6}
                            fill="var(--card)"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                          />
                        )}
                        {shape === "diamond" && (
                          <polygon
                            points={`${node.x},${node.y - DIAMOND_R} ${node.x + DIAMOND_R},${node.y} ${node.x},${node.y + DIAMOND_R} ${node.x - DIAMOND_R},${node.y}`}
                            fill="var(--card)"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                          />
                        )}
                        <text
                          x={node.x}
                          y={node.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="12"
                          fontWeight="500"
                          fill="var(--foreground)"
                        >
                          {node.label}
                        </text>
                        {annotation && (
                          <text
                            x={node.x}
                            y={node.y + 16}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="10"
                            fontWeight="600"
                            fill="var(--primary)"
                          >
                            {annotation}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{stepLabel}</p>
              {stepDescription && <p className={`mt-1 ${captionTextClass}`}>{stepDescription}</p>}
            </div>

            {stepVariables && Object.keys(stepVariables).length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 rounded-md border border-border/80 bg-card/80 p-2">
                {Object.entries(stepVariables).map(([name, value]) => (
                  <span key={name} className="font-mono text-xs">
                    <span className="font-semibold text-foreground">{name}</span>
                    <span className="text-muted-foreground"> = </span>
                    <span className="text-primary">{String(value)}</span>
                  </span>
                ))}
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
