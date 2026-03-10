import { titleClass } from "../theme";

interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  shape?: "circle" | "rect" | "diamond";
  highlight?: boolean;
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  highlight?: boolean;
}

interface DiagramProps {
  title?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

const NODE_RADIUS = 30;
const RECT_W = 80;
const RECT_H = 50;
const DIAMOND_R = 35;

function getBoundaryPoint(
  node: DiagramNode,
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

export default function Diagram({ title, nodes, edges }: DiagramProps) {
  if (!nodes || nodes.length === 0) return null;

  const sanitizedNodes = nodes.map((n, i) => {
    const x = Number(n.x);
    const y = Number(n.y);
    return {
      ...n,
      x: Number.isFinite(x) ? x : (i % 5) * 120 + 60,
      y: Number.isFinite(y) ? y : Math.floor(i / 5) * 100 + 60,
    };
  });

  const nodeMap = new Map(sanitizedNodes.map((n) => [n.id, n]));
  const PAD = 100;
  const rawMinX = Math.min(...sanitizedNodes.map((n) => n.x));
  const rawMinY = Math.min(...sanitizedNodes.map((n) => n.y));
  const rawMaxX = Math.max(...sanitizedNodes.map((n) => n.x));
  const rawMaxY = Math.max(...sanitizedNodes.map((n) => n.y));
  const vbX = Math.floor((rawMinX - PAD) / 50) * 50;
  const vbY = Math.floor((rawMinY - PAD) / 50) * 50;
  const vbW = Math.ceil((rawMaxX + PAD - vbX) / 50) * 50;
  const vbH = Math.ceil((rawMaxY + PAD - vbY) / 50) * 50;

  const safeEdges = (edges ?? []).filter(
    (e) => nodeMap.has(e.from) && nodeMap.has(e.to),
  );

  return (
    <div className="flex flex-col gap-2" style={{ minHeight: 200 }}>
      {title && <span className={titleClass}>{title}</span>}
      <svg
        viewBox={
          Number.isFinite(vbX + vbY + vbW + vbH)
            ? `${vbX} ${vbY} ${vbW} ${vbH}`
            : "0 0 500 300"
        }
        className="w-full"
        style={{ maxHeight: 400, transition: "viewBox 0.15s ease-out, height 0.15s ease-out" }}
      >
        <defs key="defs">
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path
              d="M0,0 L10,5 L0,10 Z"
              fill="var(--muted-foreground)"
            />
          </marker>
          <marker
            id="arrow-hl"
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

        {safeEdges.map((edge, i) => {
          const fromNode = nodeMap.get(edge.from)!;
          const toNode = nodeMap.get(edge.to)!;
          const [x1, y1] = getBoundaryPoint(fromNode, toNode.x, toNode.y);
          const [x2, y2] = getBoundaryPoint(toNode, fromNode.x, fromNode.y);
          const color = edge.highlight
            ? "var(--primary)"
            : "var(--muted-foreground)";
          return (
            <g key={`e-${i}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={edge.highlight ? 2 : 1.5}
                markerEnd={
                  edge.highlight ? "url(#arrow-hl)" : "url(#arrow)"
                }
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

        {sanitizedNodes.map((node, i) => {
          const shape = node.shape ?? "circle";
          const strokeColor = node.highlight
            ? "var(--primary)"
            : "var(--border)";
          const strokeWidth = node.highlight ? 2.5 : 1.5;

          return (
            <g key={`node-${node.id}-${i}`}>
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
            </g>
          );
        })}
      </svg>
    </div>
  );
}
