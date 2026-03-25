import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  type AnimationPlaybackControls,
  type PanInfo,
  type TargetAndTransition,
  type Transition,
} from "motion/react";

import type { AnchorGroupsByMessageKey, WindowRecord, WindowScrollState } from "../../../types";
import type { ResizeEdges } from "../../hooks/canvasTypes";
import type { FloatingWindowPresenceEntry } from "../../hooks/useFloatingWindowPresence";
import AddNewNoteButton from "./AddNewNoteButton";
import ChatWindow from "../window/ChatWindow";

const MAX_VISIBLE_STACK_CARDS = 3;
const SWIPE_PROGRESS_THRESHOLD = 0.5;
const OUTGOING_CLEARANCE_PX = 24;
const STACK_ENTRY_TRANSITION: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 28,
  mass: 0.85,
};
const STACK_CLEAR_TRANSITION: Transition = {
  duration: 0.18,
  ease: "easeOut",
};
const STACK_RETURN_TRANSITION: Transition = {
  duration: 0.34,
  ease: "easeInOut",
  times: [0, 0.72, 1],
};
const STACK_SNAP_BACK_TRANSITION: Transition = {
  type: "spring",
  stiffness: 340,
  damping: 30,
  mass: 0.82,
};
const STACK_RESTING_POSES = [
  {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
  },
  {
    opacity: 0.94,
    scale: 0.965,
    x: 14,
    y: 18,
  },
  {
    opacity: 0.86,
    scale: 0.93,
    x: 26,
    y: 34,
  },
] as const;

interface MobileNotesOverlayProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  entries: FloatingWindowPresenceEntry[];
  onCloseOverlay: () => void;
  onCloseWindow: (windowId: string) => void;
  onComposerChange: (windowId: string, composer: string) => void;
  onEffortChange: (
    windowId: string,
    effort: WindowRecord["selectedEffort"],
  ) => void;
  onGeometryChange: () => void;
  onHeaderPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
  ) => void;
  onMessageMouseDown: (
    event: React.MouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onModelChange: (windowId: string, model: string) => void;
  onNavigateToBranchSource: (
    windowId: string,
    branchAnchorId: string | null,
  ) => void;
  onOpenFreshRootWindow: () => void;
  onResizePointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ) => void;
  onRetry: (windowId: string, messageId: string) => void | Promise<void>;
  onSend: (windowId: string, promptOverride?: string) => void | Promise<void>;
  onToggleHistoryExpanded: (windowId: string) => void;
  onWindowFocus: (windowId: string) => void;
  onWindowScrollStateChange: (
    windowId: string,
    nextState: WindowScrollState,
  ) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
}

type SwipeDirection = "left" | "right";
type SwipeCyclePhase = "clearing" | "returning";

interface SwipeCycleState {
  clearOffsetX: number;
  clearOffsetY: number;
  direction: SwipeDirection;
  nextWindowId: string;
  outgoingWindowId: string;
  phase: SwipeCyclePhase;
  releaseOffsetX: number;
  releaseOffsetY: number;
}

function rotateEntries(
  entries: FloatingWindowPresenceEntry[],
  activeWindowId: string,
): FloatingWindowPresenceEntry[] {
  const activeIndex = entries.findIndex((entry) => entry.windowData.id === activeWindowId);
  if (activeIndex <= 0) {
    return entries;
  }

  return [...entries.slice(activeIndex), ...entries.slice(0, activeIndex)];
}

export function resolveSwipeShouldAdvance(options: {
  offsetX: number;
  stageWidth: number;
  velocityX?: number;
}): boolean {
  const width = Math.max(options.stageWidth, 1);
  return Math.abs(options.offsetX) >= width * SWIPE_PROGRESS_THRESHOLD;
}

function resolveVisibleCardCount(entryCount: number): number {
  return Math.min(Math.max(entryCount, 1), MAX_VISIBLE_STACK_CARDS);
}

function resolveRestingPoseIndex(
  stackIndex: number,
  visibleCardCount: number,
): number {
  return Math.min(
    stackIndex,
    resolveVisibleCardCount(visibleCardCount) - 1,
    STACK_RESTING_POSES.length - 1,
  );
}

export function resolveStackCycleTargetIndex(
  stackIndex: number,
  visibleCardCount: number,
): number {
  const resolvedVisibleCount = resolveVisibleCardCount(visibleCardCount);

  if (resolvedVisibleCount <= 1) {
    return 0;
  }

  if (resolvedVisibleCount === 2) {
    return stackIndex === 0 ? 1 : 0;
  }

  if (stackIndex === 0) {
    return 2;
  }

  return stackIndex === 1 ? 0 : 1;
}

export function resolveNextSwipeCycle(
  orderedEntries: FloatingWindowPresenceEntry[],
  direction: SwipeDirection,
  releaseOffsetX: number,
  releaseOffsetY: number,
  stageWidth: number,
): SwipeCycleState | null {
  if (orderedEntries.length <= 1) {
    return null;
  }

  const currentTopId = orderedEntries[0]?.windowData.id;
  const nextEntry = orderedEntries[1];
  if (!currentTopId || !nextEntry) {
    return null;
  }

  const directionMultiplier = direction === "left" ? -1 : 1;
  const clearOffsetX =
    direction === "left"
      ? Math.min(
          releaseOffsetX,
          directionMultiplier * (Math.max(stageWidth, 1) + OUTGOING_CLEARANCE_PX),
        )
      : Math.max(
          releaseOffsetX,
          directionMultiplier * (Math.max(stageWidth, 1) + OUTGOING_CLEARANCE_PX),
        );

  return {
    clearOffsetX,
    clearOffsetY: releaseOffsetY * 0.12,
    direction,
    nextWindowId: nextEntry.windowData.id,
    outgoingWindowId: currentTopId,
    phase: "clearing",
    releaseOffsetX,
    releaseOffsetY,
  };
}

export function resolveStackCardPose(
  options: {
    clearOffsetX?: number;
    clearOffsetY?: number;
    cyclePhase?: SwipeCyclePhase;
    stackIndex: number;
    direction: SwipeDirection;
    isCycling: boolean;
    isOutgoing: boolean;
    releaseOffsetX?: number;
    releaseOffsetY?: number;
    stageWidth: number;
    visibleCardCount: number;
  },
): TargetAndTransition {
  const sourcePose =
    STACK_RESTING_POSES[
      resolveRestingPoseIndex(options.stackIndex, options.visibleCardCount)
    ];
  const restingPose =
    STACK_RESTING_POSES[
      options.isCycling
        ? resolveStackCycleTargetIndex(options.stackIndex, options.visibleCardCount)
        : resolveRestingPoseIndex(options.stackIndex, options.visibleCardCount)
    ];

  if (!options.isCycling) {
    return {
      ...restingPose,
      transition: STACK_ENTRY_TRANSITION,
    };
  }

  if (options.isOutgoing) {
    if (options.cyclePhase === "clearing") {
      return {
        opacity: [1, 1],
        scale: [1, 0.985],
        x: [options.releaseOffsetX ?? 0, options.clearOffsetX ?? 0],
        y: [options.releaseOffsetY ?? 0, options.clearOffsetY ?? 0],
        transition: STACK_CLEAR_TRANSITION,
      };
    }

    return {
      opacity: [0.98, 0.94, restingPose.opacity],
      scale: [0.985, 0.955, restingPose.scale],
      x: [options.clearOffsetX ?? 0, 0, restingPose.x],
      y: [options.clearOffsetY ?? 0, restingPose.y * 0.3, restingPose.y],
      transition: STACK_RETURN_TRANSITION,
    };
  }

  if (options.cyclePhase === "clearing") {
    return {
      opacity: [sourcePose.opacity, restingPose.opacity],
      scale: [sourcePose.scale, restingPose.scale],
      x: [sourcePose.x, restingPose.x],
      y: [sourcePose.y, restingPose.y],
      transition: STACK_CLEAR_TRANSITION,
    };
  }

  return {
    ...restingPose,
    transition: STACK_ENTRY_TRANSITION,
  };
}

function MobileNotesOverlay({
  anchorGroupsByMessageKey,
  entries,
  onCloseOverlay,
  onCloseWindow,
  onComposerChange,
  onEffortChange,
  onGeometryChange,
  onHeaderPointerDown,
  onMessageMouseDown,
  onModelChange,
  onNavigateToBranchSource,
  onOpenFreshRootWindow,
  onResizePointerDown,
  onRetry,
  onSend,
  onToggleHistoryExpanded,
  onWindowFocus,
  onWindowScrollStateChange,
  registerAnchorRef,
  registerWindowRef,
}: MobileNotesOverlayProps) {
  const liveEntries = useMemo(
    () => entries.filter((entry) => !entry.isExiting),
    [entries],
  );
  const previousWindowIdsRef = useRef<string[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(
    liveEntries.at(-1)?.windowData.id ?? null,
  );
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>("left");
  const [swipeCycle, setSwipeCycle] = useState<SwipeCycleState | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const dragAnimationsRef = useRef<{
    x: AnimationPlaybackControls | null;
    y: AnimationPlaybackControls | null;
  }>({
    x: null,
    y: null,
  });

  function stopDragAnimations(): void {
    dragAnimationsRef.current.x?.stop();
    dragAnimationsRef.current.y?.stop();
    dragAnimationsRef.current = {
      x: null,
      y: null,
    };
  }

  function resetDragOffsets(): void {
    stopDragAnimations();
    dragX.set(0);
    dragY.set(0);
  }

  function animateCardBackToOrigin(): void {
    stopDragAnimations();
    dragAnimationsRef.current = {
      x: animate(dragX, 0, STACK_SNAP_BACK_TRANSITION),
      y: animate(dragY, 0, STACK_SNAP_BACK_TRANSITION),
    };
  }

  useLayoutEffect(() => {
    const nextIds = liveEntries.map((entry) => entry.windowData.id);
    const previousIds = previousWindowIdsRef.current;
    previousWindowIdsRef.current = nextIds;

    if (nextIds.length === 0) {
      if (activeWindowId !== null) {
        setActiveWindowId(null);
      }
      return;
    }

    const newestId = nextIds.find((id) => !previousIds.includes(id));
    if (newestId) {
      setActiveWindowId(newestId);
      return;
    }

    if (!activeWindowId || !nextIds.includes(activeWindowId)) {
      setActiveWindowId(nextIds[nextIds.length - 1] ?? null);
    }
  }, [activeWindowId, liveEntries]);

  useLayoutEffect(() => {
    resetDragOffsets();
  }, [activeWindowId]);

  const orderedEntries = useMemo(() => {
    if (!activeWindowId || liveEntries.length === 0) {
      return liveEntries;
    }

    return rotateEntries(liveEntries, activeWindowId);
  }, [activeWindowId, liveEntries]);

  function moveToNextCard(
    direction: SwipeDirection,
    releaseOffsetX: number,
    releaseOffsetY: number,
  ): void {
    if (swipeCycle) {
      return;
    }

    const stageWidth = stageRef.current?.clientWidth ?? 620;
    setSwipeDirection(direction);
    resetDragOffsets();
    const nextCycle = resolveNextSwipeCycle(
      orderedEntries,
      direction,
      releaseOffsetX,
      releaseOffsetY,
      stageWidth,
    );
    if (!nextCycle) {
      return;
    }

    setSwipeCycle(nextCycle);
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void {
    const stageWidth = stageRef.current?.clientWidth ?? 620;
    if (
      !resolveSwipeShouldAdvance({
        offsetX: info.offset.x,
        stageWidth,
        velocityX: info.velocity.x,
      })
    ) {
      animateCardBackToOrigin();
      return;
    }

    const direction =
      info.offset.x === 0
        ? info.velocity.x < 0
          ? "left"
          : "right"
        : info.offset.x < 0
          ? "left"
          : "right";

    moveToNextCard(direction, info.offset.x, info.offset.y);
  }

  function handleSwipeCycleComplete(windowId: string): void {
    if (!swipeCycle || swipeCycle.outgoingWindowId !== windowId) {
      return;
    }

    if (swipeCycle.phase === "clearing") {
      setSwipeCycle((current) =>
        current && current.outgoingWindowId === windowId
          ? {
              ...current,
              phase: "returning",
            }
          : current,
      );
      return;
    }

    setActiveWindowId(swipeCycle.nextWindowId);
    setSwipeCycle(null);
    onWindowFocus(swipeCycle.nextWindowId);
  }

  if (liveEntries.length === 0) {
    return null;
  }

  const visibleEntries = orderedEntries.slice(0, MAX_VISIBLE_STACK_CARDS);
  const visibleCardCount = visibleEntries.length;
  const isCycling = swipeCycle !== null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/55 backdrop-blur-[2px]"
      onClick={onCloseOverlay}
    >
      <div className="grid h-full w-full place-items-center px-4 py-6">
        <div
          className="relative h-[min(78vh,780px)] w-[min(94vw,620px)]"
          onClick={(event) => event.stopPropagation()}
          ref={stageRef}
        >
          <AddNewNoteButton onClick={onOpenFreshRootWindow} />
          {visibleEntries.map((entry, stackIndex) => {
            const isTopCard = stackIndex === 0;
            const isOutgoing = Boolean(
              swipeCycle && swipeCycle.outgoingWindowId === entry.windowData.id,
            );
            const stageWidth = stageRef.current?.clientWidth ?? 620;
            const cardPose = resolveStackCardPose({
              clearOffsetX: swipeCycle?.clearOffsetX,
              clearOffsetY: swipeCycle?.clearOffsetY,
              cyclePhase: swipeCycle?.phase,
              direction: swipeCycle?.direction ?? swipeDirection,
              isCycling,
              isOutgoing,
              releaseOffsetX: swipeCycle?.releaseOffsetX,
              releaseOffsetY: swipeCycle?.releaseOffsetY,
              stackIndex,
              stageWidth,
              visibleCardCount,
            });
            const targetStackIndex = isCycling
              ? resolveStackCycleTargetIndex(stackIndex, visibleCardCount)
              : resolveRestingPoseIndex(stackIndex, visibleCardCount);
            const zIndex = isOutgoing && swipeCycle?.phase === "clearing"
              ? 50
              : 40 - targetStackIndex;
            return (
              <motion.div
                key={entry.windowData.id}
                animate={cardPose}
                className="absolute inset-0"
                initial={{
                  opacity: 0.6,
                  scale: 0.94,
                  x: swipeDirection === "left" ? 24 : -24,
                  y: 20,
                }}
                style={{
                  pointerEvents: isTopCard && !isCycling ? "auto" : "none",
                  zIndex,
                }}
                onAnimationComplete={() =>
                  isOutgoing ? handleSwipeCycleComplete(entry.windowData.id) : undefined
                }
              >
                <motion.div
                  className="h-full"
                  drag={isTopCard && !isCycling ? true : false}
                  dragElastic={0}
                  dragMomentum={false}
                  style={isTopCard && !isCycling ? { x: dragX, y: dragY } : undefined}
                  onDragEnd={isTopCard ? handleDragEnd : undefined}
                  onDragStart={isTopCard ? stopDragAnimations : undefined}
                  onPointerDown={() => onWindowFocus(entry.windowData.id)}
                >
                  <div className="paper-texture-window h-full overflow-hidden rounded-[24px] border border-paper-stroke/40 bg-paper-window shadow-[var(--paper-window-shadow)]">
                    <ChatWindow
                      anchorGroupsByMessageKey={anchorGroupsByMessageKey}
                      isFixedPane
                      isFocused={isCycling ? targetStackIndex === 0 : isTopCard}
                      messages={entry.messages}
                      onClose={onCloseWindow}
                      onComposerChange={onComposerChange}
                      onEffortChange={onEffortChange}
                      onGeometryChange={onGeometryChange}
                      onHeaderPointerDown={onHeaderPointerDown}
                      onMessageMouseDown={onMessageMouseDown}
                      onModelChange={onModelChange}
                      onNavigateToBranchSource={onNavigateToBranchSource}
                      onResizePointerDown={onResizePointerDown}
                      onRetry={onRetry}
                      onSend={onSend}
                      onToggleHistoryExpanded={onToggleHistoryExpanded}
                      onWindowFocus={onWindowFocus}
                      onWindowScrollStateChange={onWindowScrollStateChange}
                      registerAnchorRef={registerAnchorRef}
                      registerWindowRef={registerWindowRef}
                      savedScrollState={entry.savedScrollState}
                      showFixedPaneCloseButton
                      windowData={entry.windowData}
                      zIndex={targetStackIndex + 1}
                    />
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MobileNotesOverlay;
