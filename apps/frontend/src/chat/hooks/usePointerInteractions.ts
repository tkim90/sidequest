import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
} from "react";

import type { AppState } from "../../types";
import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
} from "../lib/constants";
import { clamp } from "../lib/geometry";
import { getViewportEffectiveScale } from "./canvasUtils";
import type {
  CanvasInteraction,
  InertiaState,
  PointerSample,
  ResizeEdges,
} from "./canvasTypes";

const POINTER_SAMPLE_WINDOW_MS = 120;
const MAX_POINTER_SAMPLES = 8;
const MIN_SAMPLE_SEPARATION_MS = 16;
const MAX_RELEASE_SPEED = 2200;
const MIN_START_SPEED = 90;
const STOP_SPEED = 20;
const MAX_FRAME_DT_S = 0.032;
const FRICTION_PER_SECOND = 8;

interface Bounds {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
}

interface ReleaseVelocity {
  vx: number;
  vy: number;
}

interface MomentumFrameInput {
  bounds: Bounds;
  dt: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

interface MomentumFrameResult {
  stopped: boolean;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

interface UsePointerInteractionsOptions {
  appStateRef: RefObject<AppState>;
  canvasRef: RefObject<HTMLDivElement | null>;
  requestGeometryRefresh: () => void;
  setAppState: Dispatch<SetStateAction<AppState>>;
  viewport: AppState["viewport"];
}

function clampMagnitude(value: number, maxMagnitude: number): number {
  return clamp(value, -maxMagnitude, maxMagnitude);
}

function getWindowBounds(
  appState: AppState,
  canvasNode: HTMLDivElement | null,
  windowWidth: number,
  windowHeight: number,
): Bounds {
  const effectiveScale = getViewportEffectiveScale(appState.viewport) || 1;
  const minX = -appState.viewport.x / effectiveScale;
  const minY = -appState.viewport.y / effectiveScale;
  const maxX = Math.max(
    minX,
    (canvasNode
      ? (-appState.viewport.x + canvasNode.clientWidth) / effectiveScale
      : Number.POSITIVE_INFINITY) - windowWidth,
  );
  const maxY = Math.max(
    minY,
    (canvasNode
      ? (-appState.viewport.y + canvasNode.clientHeight) / effectiveScale
      : Number.POSITIVE_INFINITY) - windowHeight,
  );

  return {
    maxX,
    maxY,
    minX,
    minY,
  };
}

export function shouldStartMomentum(speed: number): boolean {
  return speed >= MIN_START_SPEED;
}

export function computeReleaseVelocity(
  samples: PointerSample[],
  scale: number,
): ReleaseVelocity {
  if (samples.length < 2 || scale <= 0) {
    return { vx: 0, vy: 0 };
  }

  const latest = samples[samples.length - 1];
  if (!latest) {
    return { vx: 0, vy: 0 };
  }

  const validSamples = samples
    .slice()
    .reverse()
    .filter((sample) => latest.timeMs - sample.timeMs >= MIN_SAMPLE_SEPARATION_MS);
  const oldest = validSamples[validSamples.length - 1];

  if (!oldest) {
    return { vx: 0, vy: 0 };
  }

  const dtMs = latest.timeMs - oldest.timeMs;
  if (dtMs < MIN_SAMPLE_SEPARATION_MS) {
    return { vx: 0, vy: 0 };
  }

  const rawVx = ((latest.clientX - oldest.clientX) / scale / dtMs) * 1000;
  const rawVy = ((latest.clientY - oldest.clientY) / scale / dtMs) * 1000;
  const speed = Math.hypot(rawVx, rawVy);

  if (speed <= MAX_RELEASE_SPEED) {
    return { vx: rawVx, vy: rawVy };
  }

  const ratio = MAX_RELEASE_SPEED / speed;
  return {
    vx: rawVx * ratio,
    vy: rawVy * ratio,
  };
}

export function stepMomentumFrame({
  bounds,
  dt,
  vx,
  vy,
  x,
  y,
}: MomentumFrameInput): MomentumFrameResult {
  const nextX = x + vx * dt;
  const nextY = y + vy * dt;
  const clampedX = clamp(nextX, bounds.minX, bounds.maxX);
  const clampedY = clamp(nextY, bounds.minY, bounds.maxY);
  const decay = Math.exp(-FRICTION_PER_SECOND * dt);
  let nextVx = vx * decay;
  let nextVy = vy * decay;

  if (clampedX !== nextX) {
    nextVx = 0;
  }
  if (clampedY !== nextY) {
    nextVy = 0;
  }

  return {
    stopped:
      Math.hypot(nextVx, nextVy) < STOP_SPEED ||
      (nextVx === 0 && nextVy === 0),
    vx: nextVx,
    vy: nextVy,
    x: clampedX,
    y: clampedY,
  };
}

function appendPointerSample(
  samples: PointerSample[],
  sample: PointerSample,
): PointerSample[] {
  const retained = [...samples, sample].filter(
    (entry) => sample.timeMs - entry.timeMs <= POINTER_SAMPLE_WINDOW_MS,
  );

  return retained.slice(-MAX_POINTER_SAMPLES);
}

export function usePointerInteractions({
  appStateRef,
  canvasRef,
  requestGeometryRefresh,
  setAppState,
  viewport,
}: UsePointerInteractionsOptions) {
  const interactionRef = useRef<CanvasInteraction | null>(null);
  const frameRef = useRef<number | null>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const inertiaRef = useRef<InertiaState | null>(null);
  const pendingPointerRef = useRef<{ clientX: number; clientY: number } | null>(
    null,
  );
  const pointerSamplesRef = useRef<PointerSample[]>([]);

  const cancelInertia = useCallback(() => {
    if (inertiaFrameRef.current !== null) {
      window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
    inertiaRef.current = null;
  }, []);

  const applyPendingInteraction = useCallback(() => {
    const interaction = interactionRef.current;
    const pendingPointer = pendingPointerRef.current;
    if (!interaction || !pendingPointer) {
      return;
    }

    pendingPointerRef.current = null;

    const dx = (pendingPointer.clientX - interaction.startClientX) / interaction.scale;
    const dy = (pendingPointer.clientY - interaction.startClientY) / interaction.scale;

    setAppState((current) => {
      const windowData = current.windows[interaction.windowId];
      if (!windowData) {
        return current;
      }

      if (interaction.type === "drag") {
        const bounds = getWindowBounds(
          current,
          canvasRef.current,
          windowData.width,
          windowData.height,
        );

        return {
          ...current,
          windows: {
            ...current.windows,
            [interaction.windowId]: {
              ...windowData,
              x: clamp(interaction.startX + dx, bounds.minX, bounds.maxX),
              y: clamp(interaction.startY + dy, bounds.minY, bounds.maxY),
            },
          },
        };
      }

      let nextX = interaction.startX;
      let nextY = interaction.startY;
      let nextWidth = interaction.startWidth;
      let nextHeight = interaction.startHeight;

      if (interaction.edges.east) {
        nextWidth = Math.max(MIN_WINDOW_WIDTH, interaction.startWidth + dx);
      }
      if (interaction.edges.south) {
        nextHeight = Math.max(MIN_WINDOW_HEIGHT, interaction.startHeight + dy);
      }
      if (interaction.edges.west) {
        nextWidth = Math.max(MIN_WINDOW_WIDTH, interaction.startWidth - dx);
        nextX = interaction.startX + (interaction.startWidth - nextWidth);
      }
      if (interaction.edges.north) {
        nextHeight = Math.max(MIN_WINDOW_HEIGHT, interaction.startHeight - dy);
        nextY = interaction.startY + (interaction.startHeight - nextHeight);
      }

      return {
        ...current,
        windows: {
          ...current.windows,
          [interaction.windowId]: {
            ...windowData,
            x: nextX,
            y: nextY,
            width: nextWidth,
            height: nextHeight,
          },
        },
      };
    });
  }, [canvasRef, setAppState]);

  const scheduleInertiaFrame = useCallback(() => {
    if (inertiaFrameRef.current !== null) {
      return;
    }

    inertiaFrameRef.current = window.requestAnimationFrame((timestamp) => {
      inertiaFrameRef.current = null;
      const inertia = inertiaRef.current;
      if (!inertia) {
        return;
      }

      const dt = Math.min(
        MAX_FRAME_DT_S,
        Math.max(0, (timestamp - inertia.lastTimeMs) / 1000),
      );
      let shouldContinue = false;

      setAppState((current) => {
        const windowData = current.windows[inertia.windowId];
        if (!windowData) {
          inertiaRef.current = null;
          return current;
        }

        const bounds = getWindowBounds(
          current,
          canvasRef.current,
          windowData.width,
          windowData.height,
        );
        const nextFrame = stepMomentumFrame({
          bounds,
          dt,
          vx: inertia.vx,
          vy: inertia.vy,
          x: windowData.x,
          y: windowData.y,
        });

        inertiaRef.current = nextFrame.stopped
          ? null
          : {
              lastTimeMs: timestamp,
              vx: nextFrame.vx,
              vy: nextFrame.vy,
              windowId: inertia.windowId,
            };
        shouldContinue = !nextFrame.stopped;

        if (nextFrame.x === windowData.x && nextFrame.y === windowData.y) {
          return current;
        }

        return {
          ...current,
          windows: {
            ...current.windows,
            [inertia.windowId]: {
              ...windowData,
              x: nextFrame.x,
              y: nextFrame.y,
            },
          },
        };
      });

      if (shouldContinue) {
        scheduleInertiaFrame();
      } else {
        requestGeometryRefresh();
      }
    });
  }, [canvasRef, requestGeometryRefresh, setAppState]);

  const startInertia = useCallback(
    (windowId: string, velocity: ReleaseVelocity) => {
      cancelInertia();
      inertiaRef.current = {
        lastTimeMs: performance.now(),
        vx: clampMagnitude(velocity.vx, MAX_RELEASE_SPEED),
        vy: clampMagnitude(velocity.vy, MAX_RELEASE_SPEED),
        windowId,
      };
      scheduleInertiaFrame();
    },
    [cancelInertia, scheduleInertiaFrame],
  );

  const scheduleInteractionFrame = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      applyPendingInteraction();
    });
  }, [applyPendingInteraction]);

  const flushPendingInteraction = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    applyPendingInteraction();
  }, [applyPendingInteraction]);

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent): void {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      pendingPointerRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
      };

      if (interaction.type === "drag") {
        pointerSamplesRef.current = appendPointerSample(pointerSamplesRef.current, {
          clientX: event.clientX,
          clientY: event.clientY,
          timeMs: performance.now(),
        });
      }

      scheduleInteractionFrame();
    }

    function handlePointerUp(): void {
      const interaction = interactionRef.current;
      if (interaction) {
        flushPendingInteraction();

        if (interaction.type === "drag") {
          const velocity = computeReleaseVelocity(
            pointerSamplesRef.current,
            interaction.scale,
          );
          const speed = Math.hypot(velocity.vx, velocity.vy);

          if (shouldStartMomentum(speed)) {
            startInertia(interaction.windowId, velocity);
          }
        }

        interactionRef.current = null;
        pendingPointerRef.current = null;
        pointerSamplesRef.current = [];
        requestGeometryRefresh();
      }
    }

    function handlePointerCancel(): void {
      handlePointerUp();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [
    flushPendingInteraction,
    requestGeometryRefresh,
    scheduleInteractionFrame,
    startInertia,
  ]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      cancelInertia();
    },
    [cancelInertia],
  );

  useEffect(() => {
    function handleWindowResize(): void {
      cancelInertia();
    }

    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [cancelInertia]);

  useEffect(() => {
    cancelInertia();
  }, [cancelInertia, viewport.scale, viewport.x, viewport.y, viewport.zoom]);

  const bringWindowToFront = useCallback(
    (windowId: string) => {
      cancelInertia();

      setAppState((current) => {
        const targetWindow = current.windows[windowId];
        if (!targetWindow) {
          return current;
        }

        const pinnedMainWindowId = current.zOrder.find((candidateId) => {
          const candidateWindow = current.windows[candidateId];
          return candidateWindow?.parentId === null;
        });
        if (pinnedMainWindowId === windowId) {
          return current;
        }

        return {
          ...current,
          zOrder: [
            ...current.zOrder.filter((candidateId) => candidateId !== windowId),
            windowId,
          ],
        };
      });
    },
    [cancelInertia, setAppState],
  );

  function onCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("[data-chat-window]")) {
      return;
    }
  }

  function onHeaderPointerDown(
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
  ): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    bringWindowToFront(windowId);

    const windowData = appStateRef.current.windows[windowId];
    if (!windowData) {
      return;
    }

    interactionRef.current = {
      type: "drag",
      windowId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: windowData.x,
      startY: windowData.y,
      scale: getViewportEffectiveScale(appStateRef.current.viewport),
    };
    pointerSamplesRef.current = [
      {
        clientX: event.clientX,
        clientY: event.clientY,
        timeMs: performance.now(),
      },
    ];
  }

  function onResizePointerDown(
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    bringWindowToFront(windowId);
    pointerSamplesRef.current = [];

    const windowData = appStateRef.current.windows[windowId];
    if (!windowData) {
      return;
    }

    interactionRef.current = {
      type: "resize",
      windowId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: windowData.x,
      startY: windowData.y,
      startWidth: windowData.width,
      startHeight: windowData.height,
      scale: getViewportEffectiveScale(appStateRef.current.viewport),
      edges,
    };
  }

  return {
    onCanvasPointerDown,
    onHeaderPointerDown,
    onResizePointerDown,
    onWindowFocus: bringWindowToFront,
  };
}
