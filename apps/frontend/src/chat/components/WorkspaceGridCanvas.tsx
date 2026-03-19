import { useEffect, useRef, type RefObject } from "react";

import type { Viewport } from "../../types";
import { getViewportEffectiveScale } from "../hooks/canvasUtils";

const GRID_SPACING = 40;
const MAJOR_GRID_MULTIPLIER = 5;

interface WorkspaceGridCanvasProps {
  hostRef: RefObject<HTMLElement | null>;
  viewport: Viewport;
}

function resolveColor(
  styles: CSSStyleDeclaration,
  property: string,
  fallback: string,
): string {
  const value = styles.getPropertyValue(property).trim();
  return value || fallback;
}

function wrapOffset(offset: number, spacing: number): number {
  if (spacing <= 0) {
    return 0;
  }

  return ((offset % spacing) + spacing) % spacing;
}

function drawGrid(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  viewport: Viewport,
): void {
  const rect = host.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const styles = window.getComputedStyle(host);
  const backgroundColor = resolveColor(styles, "--paper", "#f4efe4");
  const minorGridColor = resolveColor(styles, "--paper-grid", "#ded8ca");
  const majorGridColor = resolveColor(styles, "--border", "#cfc6b2");

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const fill = context.createLinearGradient(0, 0, 0, height);
  fill.addColorStop(0, backgroundColor);
  fill.addColorStop(1, "#f7f2e8");
  context.fillStyle = fill;
  context.fillRect(0, 0, width, height);

  const scale = Math.max(0.001, getViewportEffectiveScale(viewport));
  const minorSpacing = GRID_SPACING * scale;
  const majorSpacing = minorSpacing * MAJOR_GRID_MULTIPLIER;

  context.lineWidth = 1;

  const drawAxis = (
    spacing: number,
    offset: number,
    limit: number,
    drawLine: (position: number) => void,
  ) => {
    if (spacing < 10) {
      return;
    }

    for (let position = offset; position <= limit; position += spacing) {
      drawLine(Math.round(position) + 0.5);
    }
  };

  context.strokeStyle = minorGridColor;
  drawAxis(minorSpacing, wrapOffset(viewport.x, minorSpacing), width, (x) => {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  });
  drawAxis(minorSpacing, wrapOffset(viewport.y, minorSpacing), height, (y) => {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  });

  context.strokeStyle = majorGridColor;
  drawAxis(majorSpacing, wrapOffset(viewport.x, majorSpacing), width, (x) => {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  });
  drawAxis(majorSpacing, wrapOffset(viewport.y, majorSpacing), height, (y) => {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  });
}

export default function WorkspaceGridCanvas({
  hostRef,
  viewport,
}: WorkspaceGridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) {
      return;
    }

    const render = () => {
      drawGrid(canvas, host, viewport);
    };

    render();

    const observer = new ResizeObserver(() => {
      render();
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, [hostRef, viewport]);

  return (
    <canvas
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      ref={canvasRef}
    />
  );
}
