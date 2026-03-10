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
  label: string;
  title?: string;
  description?: string;
  code?: string;
  language?: string;
  graph?: GraphData;
  steps: Step[];
}

interface AlgorithmVisualizerProps {
  title: string;
  description?: string;
  code: string;
  language?: string;
  graph: GraphData;
  steps: Step[];
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

  const baseScenario = useMemo<VisualizerScenario>(
    () => ({
      label: "Current",
      title,
      description,
      code,
      language,
      graph,
      steps,
    }),
    [title, description, code, language, graph, steps],
  );

  const fallbackExamples = useMemo<VisualizerScenario[]>(() => {
    if (!steps || steps.length === 0) {
      return [];
    }

    const shortLength = Math.max(1, Math.min(6, Math.ceil(steps.length / 3)));
    return [
      {
        label: "Simple",
        title,
        description: "Simple run with fewer iterations",
        code,
        language,
        graph,
        steps: steps.slice(0, shortLength),
      },
      {
        label: "Larger",
        title,
        description: "Slightly larger run with full iteration history",
        code,
        language,
        graph,
        steps,
      },
    ];
  }, [title, description, code, language, graph, steps]);

  const providedExamples = useMemo<VisualizerScenario[]>(
    () =>
      (examples ?? [])
        .filter((example) => Array.isArray(example.steps) && example.steps.length > 0)
        .map((example) => ({
          label: example.label,
          title: example.title ?? title,
          description: example.description,
          code: example.code ?? code,
          language: example.language ?? language,
          graph: example.graph ?? graph,
          steps: example.steps,
        })),
    [examples, title, code, language, graph],
  );

  const selectableExamples = providedExamples.length > 0 ? providedExamples : fallbackExamples;

  const activeScenario =
    activeExampleIndex === null
      ? baseScenario
      : selectableExamples[activeExampleIndex] ?? baseScenario;

  const totalSteps = activeScenario.steps.length;
  const maxIndex = Math.max(totalSteps - 1, 0);
  const currentIndex = Math.min(current, maxIndex);
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

  const step = activeScenario.steps[currentIndex] ?? { label: "Waiting for steps" };

  const codeLineCount = activeScenario.code.split(/\r?\n/).length;
  const highlightLines =
    step.highlightLines && step.highlightLines.length > 0
      ? step.highlightLines
      : [Math.min(currentIndex + 1, codeLineCount)];

  const highlightLineSet = new Set(highlightLines);
  const highlightNodeSet = new Set(step.highlightNodes ?? []);
  const highlightEdgeSet = new Set((step.highlightEdges ?? []).map(([f, t]) => `${f}->${t}`));
  const annotations = step.nodeAnnotations ?? {};

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
        {title && <p className={titleClass}>{title}</p>}
        <div className="mt-3 flex h-48 animate-pulse items-center justify-center rounded-lg border border-border bg-secondary">
          <span className="text-sm text-muted-foreground">Loading Visualizer...</span>
        </div>
      </div>
    );
  }

  // --- Graph layout ---
  const nodes = (activeScenario.graph.nodes ?? []).map((n, i) => {
    const x = Number(n.x);
    const y = Number(n.y);
    return {
      ...n,
      x: Number.isFinite(x) ? x : (i % 5) * 120 + 60,
      y: Number.isFinite(y) ? y : Math.floor(i / 5) * 100 + 60,
    };
  });
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges = (activeScenario.graph.edges ?? []).filter(
    (e) => nodeMap.has(e.from) && nodeMap.has(e.to),
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
                    const lineAnnotation = step.lineAnnotations?.[lineNum];
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
              <p className="text-sm font-medium text-foreground">{step.label}</p>
              {step.description && <p className={`mt-1 ${captionTextClass}`}>{step.description}</p>}
            </div>

            {step.variables && Object.keys(step.variables).length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 rounded-md border border-border/80 bg-card/80 p-2">
                {Object.entries(step.variables).map(([name, value]) => (
                  <span key={name} className="font-mono text-xs">
                    <span className="font-semibold text-foreground">{name}</span>
                    <span className="text-muted-foreground"> = </span>
                    <span className="text-primary">{value}</span>
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
