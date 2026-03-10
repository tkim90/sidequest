import { useState } from "react";
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

interface AlgorithmVisualizerProps {
  title: string;
  code: string;
  language?: string;
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  steps: Step[];
}

const NODE_RADIUS = 30;
const RECT_W = 80;
const RECT_H = 50;
const DIAMOND_R = 35;

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
  code,
  language = "javascript",
  graph,
  steps,
}: AlgorithmVisualizerProps) {
  const [current, setCurrent] = useState(0);

  if (!steps || steps.length === 0) {
    return (
      <div className={`${surfaceClass} p-4`}>
        {title && <p className={titleClass}>{title}</p>}
        <div className="mt-3 flex h-48 animate-pulse items-center justify-center rounded-lg border border-border bg-secondary">
          <span className="text-sm text-muted-foreground">Loading Visualizer...</span>
        </div>
      </div>
    );
  }

  const step = steps[current];
  const highlightLineSet = new Set(step.highlightLines ?? []);
  const highlightNodeSet = new Set(step.highlightNodes ?? []);
  const highlightEdgeSet = new Set(
    (step.highlightEdges ?? []).map(([f, t]) => `${f}->${t}`),
  );
  const annotations = step.nodeAnnotations ?? {};

  // --- Graph layout ---
  const nodes = (graph?.nodes ?? []).map((n, i) => {
    const x = Number(n.x);
    const y = Number(n.y);
    return {
      ...n,
      x: Number.isFinite(x) ? x : (i % 5) * 120 + 60,
      y: Number.isFinite(y) ? y : Math.floor(i / 5) * 100 + 60,
    };
  });
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges = (graph?.edges ?? []).filter(
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

  return (
    <div
      className={`${surfaceClass} p-4`}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <p className={titleClass}>{title}</p>

      {/* Two-column layout: code left, diagram right */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Code panel */}
        <div
          className={`${insetSurfaceClass} overflow-hidden`}
        >
          <Highlight
            theme={themes.github}
            code={code}
            language={language}
          >
            {({ tokens, getLineProps, getTokenProps }) => (
              <pre className="overflow-x-auto p-3 text-xs leading-5 font-mono" style={{ background: "transparent" }}>
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
                        className={`flex transition-colors duration-150 ${isHighlighted ? "bg-primary/15 rounded" : ""}`}
                      >
                        <span className="mr-3 inline-block w-6 shrink-0 select-none text-right text-muted-foreground opacity-50">
                          {lineNum}
                        </span>
                        <span className="flex-1">
                          {line.map((token, tokenIndex) => (
                            <span key={tokenIndex} {...getTokenProps({ token })} />
                          ))}
                        </span>
                        {lineAnnotation && (
                          <span className="ml-4 shrink-0 whitespace-nowrap text-[11px] italic text-primary/70">
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

        {/* Diagram panel */}
        <div className={`${insetSurfaceClass} flex items-center justify-center p-2`}>
          {nodes.length > 0 && (
            <svg
              viewBox={
                Number.isFinite(vbX + vbY + vbW + vbH)
                  ? `${vbX} ${vbY} ${vbW} ${vbH}`
                  : "0 0 500 300"
              }
              className="w-full"
              style={{ maxHeight: 350 }}
            >
              <defs>
                <marker
                  id="av-arrow"
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
                  id="av-arrow-hl"
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

              {/* Edges */}
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
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={color}
                      strokeWidth={isHL ? 2.5 : 1.5}
                      markerEnd={isHL ? "url(#av-arrow-hl)" : "url(#av-arrow)"}
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

              {/* Nodes */}
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
                        cx={node.x} cy={node.y} r={NODE_RADIUS}
                        fill="var(--card)"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                      />
                    )}
                    {shape === "rect" && (
                      <rect
                        x={node.x - RECT_W / 2} y={node.y - RECT_H / 2}
                        width={RECT_W} height={RECT_H} rx={6}
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
                      x={node.x} y={node.y}
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
                        x={node.x} y={node.y + 16}
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
      </div>

      {/* Step info */}
      <div className={`${insetSurfaceClass} mt-3 p-3`}>
        <p className="text-xs font-medium text-foreground">
          Step {current + 1} of {steps.length}: {step.label}
        </p>
        {step.description && (
          <p className={`mt-1 ${captionTextClass}`}>{step.description}</p>
        )}
      </div>

      {/* Variables */}
      {step.variables && Object.keys(step.variables).length > 0 && (
        <div className={`${insetSurfaceClass} mt-3 p-3`}>
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

      {/* Step controls */}
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
