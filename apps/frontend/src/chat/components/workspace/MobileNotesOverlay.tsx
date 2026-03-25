import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  type AnimationPlaybackControls,
  type TargetAndTransition,
  type Transition,
} from "motion/react";

import type { AnchorGroupsByMessageKey, WindowRecord, WindowScrollState } from "../../../types";
import { useMountEffect } from "../../../hooks/useMountEffect";
import type { ResizeEdges } from "../../hooks/canvasTypes";
import type { FloatingWindowPresenceEntry } from "../../hooks/useFloatingWindowPresence";
import ChatWindow from "../window/ChatWindow";

const MAX_VISIBLE_STACK_CARDS = 3;
const BODY_SWIPE_CAPTURE_THRESHOLD_PX = 10;
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
    event: React.PointerEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onModelChange: (windowId: string, model: string) => void;
  onNavigateToBranchSource: (
    windowId: string,
    branchAnchorId: string | null,
  ) => void;
  onResizePointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ) => void;
  onRetry: (windowId: string, messageId: string) => void | Promise<void>;
  onSend: (windowId: string, promptOverride?: string) => void | Promise<void>;
  onToggleHistoryExpanded: (windowId: string) => void;
  onPreferredActiveWindowIdConsumed: () => void;
  onWindowFocus: (windowId: string) => void;
  onWindowScrollStateChange: (
    windowId: string,
    nextState: WindowScrollState,
  ) => void;
  preferredActiveWindowId: string | null;
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

interface DragGestureState {
  captureNode: HTMLElement;
  isDragging: boolean;
  originX: number;
  originY: number;
  pointerId: number;
  startClientX: number;
  startClientY: number;
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

export function resolveNewestWindowId(
  nextIds: string[],
  previousIds: string[],
): string | null {
  const unseenIds = nextIds.filter((id) => !previousIds.includes(id));
  return unseenIds.at(-1) ?? null;
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
  onResizePointerDown,
  onRetry,
  onSend,
  onToggleHistoryExpanded,
  onPreferredActiveWindowIdConsumed,
  onWindowFocus,
  onWindowScrollStateChange,
  preferredActiveWindowId,
  registerAnchorRef,
  registerWindowRef,
}: MobileNotesOverlayProps) {
  const liveEntries = useMemo(
    () => entries.filter((entry) => !entry.isExiting),
    [entries],
  );
  const previousWindowIdsRef = useRef<string[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(
    preferredActiveWindowId ?? liveEntries.at(-1)?.windowData.id ?? null,
  );
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>("left");
  const [swipeCycle, setSwipeCycle] = useState<SwipeCycleState | null>(null);
  const activeDragGestureRef = useRef<DragGestureState | null>(null);
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

  function releaseDragGesture(state: DragGestureState): void {
    if (state.captureNode.hasPointerCapture(state.pointerId)) {
      state.captureNode.releasePointerCapture(state.pointerId);
    }
  }

  function clearDragGesture(): void {
    const current = activeDragGestureRef.current;
    if (!current) {
      return;
    }

    releaseDragGesture(current);
    activeDragGestureRef.current = null;
  }

  function isInteractiveGestureTarget(target: HTMLElement | null): boolean {
    if (!target) {
      return false;
    }

    return Boolean(
      target.closest(
        "a, button, input, select, textarea, [data-notebook-scrollbar]",
      ),
    );
  }

  function handleGestureRelease(offsetX: number, offsetY: number): void {
    const stageWidth = stageRef.current?.clientWidth ?? 620;
    if (
      !resolveSwipeShouldAdvance({
        offsetX,
        stageWidth,
      })
    ) {
      animateCardBackToOrigin();
      return;
    }

    moveToNextCard(offsetX < 0 ? "left" : "right", offsetX, offsetY);
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

    if (preferredActiveWindowId && nextIds.includes(preferredActiveWindowId)) {
      if (activeWindowId !== preferredActiveWindowId) {
        setActiveWindowId(preferredActiveWindowId);
      }
      onPreferredActiveWindowIdConsumed();
      return;
    }

    const newestId = resolveNewestWindowId(nextIds, previousIds);
    if (newestId) {
      setActiveWindowId(newestId);
      return;
    }

    if (!activeWindowId || !nextIds.includes(activeWindowId)) {
      setActiveWindowId(nextIds[nextIds.length - 1] ?? null);
    }
  }, [
    activeWindowId,
    liveEntries,
    onPreferredActiveWindowIdConsumed,
    preferredActiveWindowId,
  ]);

  useLayoutEffect(() => {
    resetDragOffsets();
  }, [activeWindowId]);

  useLayoutEffect(() => {
    function handleDocumentPointerMove(event: PointerEvent): void {
      const gesture = activeDragGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId || swipeCycle) {
        return;
      }

      const deltaX = event.clientX - gesture.startClientX;
      const deltaY = event.clientY - gesture.startClientY;

      if (!gesture.isDragging) {
        if (
          Math.abs(deltaX) < BODY_SWIPE_CAPTURE_THRESHOLD_PX &&
          Math.abs(deltaY) < BODY_SWIPE_CAPTURE_THRESHOLD_PX
        ) {
          return;
        }

        if (Math.abs(deltaX) <= Math.abs(deltaY)) {
          activeDragGestureRef.current = null;
          return;
        }

        event.preventDefault();
        gesture.captureNode.setPointerCapture(event.pointerId);
        activeDragGestureRef.current = {
          ...gesture,
          isDragging: true,
        };
      }

      const activeGesture = activeDragGestureRef.current;
      if (!activeGesture?.isDragging) {
        return;
      }

      event.preventDefault();
      dragX.set(activeGesture.originX + deltaX);
      dragY.set(activeGesture.originY + deltaY);
    }

    function finalizeDocumentPointer(event: PointerEvent, snapBack: boolean): void {
      const gesture = activeDragGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      const offsetX = gesture.originX + (event.clientX - gesture.startClientX);
      const offsetY = gesture.originY + (event.clientY - gesture.startClientY);
      releaseDragGesture(gesture);
      activeDragGestureRef.current = null;

      if (!gesture.isDragging) {
        return;
      }

      if (snapBack) {
        animateCardBackToOrigin();
        return;
      }

      handleGestureRelease(offsetX, offsetY);
    }

    function handleDocumentPointerUp(event: PointerEvent): void {
      finalizeDocumentPointer(event, false);
    }

    function handleDocumentPointerCancel(event: PointerEvent): void {
      finalizeDocumentPointer(event, true);
    }

    window.addEventListener("pointermove", handleDocumentPointerMove);
    window.addEventListener("pointerup", handleDocumentPointerUp);
    window.addEventListener("pointercancel", handleDocumentPointerCancel);

    return () => {
      window.removeEventListener("pointermove", handleDocumentPointerMove);
      window.removeEventListener("pointerup", handleDocumentPointerUp);
      window.removeEventListener("pointercancel", handleDocumentPointerCancel);
    };
  });

  useMountEffect(() => {
    return () => {
      clearDragGesture();
    };
  });

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
    const nextCycle = resolveNextSwipeCycle(
      orderedEntries,
      direction,
      releaseOffsetX,
      releaseOffsetY,
      stageWidth,
    );
    if (!nextCycle) {
      animateCardBackToOrigin();
      return;
    }

    resetDragOffsets();
    setSwipeCycle(nextCycle);
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

  function handleHeaderDragPointerDown(
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
  ): void {
    if (swipeCycle || activeDragGestureRef.current) {
      return;
    }

    if (isInteractiveGestureTarget(event.target as HTMLElement | null)) {
      return;
    }

    stopDragAnimations();
    onWindowFocus(windowId);
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    activeDragGestureRef.current = {
      captureNode: event.currentTarget,
      isDragging: true,
      originX: dragX.get(),
      originY: dragY.get(),
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
  }

  function handleBodyPointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    windowId: string,
  ): void {
    if (swipeCycle || activeDragGestureRef.current) {
      return;
    }

    if (isInteractiveGestureTarget(event.target as HTMLElement | null)) {
      return;
    }

    stopDragAnimations();
    onWindowFocus(windowId);
    activeDragGestureRef.current = {
      captureNode: event.currentTarget,
      isDragging: false,
      originX: dragX.get(),
      originY: dragY.get(),
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
  }

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/55 backdrop-blur-[2px]"
      data-mobile-notes-overlay="true"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onClick={onCloseOverlay}
    >
      <div className="grid h-full w-full place-items-center px-4 py-6">
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative h-[min(78vh,780px)] w-[min(88vw,560px)]"
          exit={{ opacity: 0, scale: 0.98, y: 14 }}
          initial={{ opacity: 0, scale: 0.98, y: 18 }}
          onClick={(event) => event.stopPropagation()}
          ref={stageRef}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
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
                  style={isTopCard && !isCycling ? { x: dragX, y: dragY } : undefined}
                  onPointerDown={() => onWindowFocus(entry.windowData.id)}
                >
                  <div className="paper-texture-window h-full overflow-hidden rounded-[24px] border border-paper-stroke/40 bg-paper-window shadow-[var(--paper-window-shadow)]">
                    <ChatWindow
                      anchorGroupsByMessageKey={anchorGroupsByMessageKey}
                      alwaysShowCloseButton={isTopCard}
                      isFixedPane
                      isFocused={isCycling ? targetStackIndex === 0 : isTopCard}
                      messages={entry.messages}
                      mobileInteractionMode={isTopCard && !isCycling ? "scroll-first-swipe" : undefined}
                      onMobileBodyPointerDown={
                        isTopCard && !isCycling
                          ? (event) => handleBodyPointerDown(event, entry.windowData.id)
                          : undefined
                      }
                      onMobileHeaderPointerDown={
                        isTopCard && !isCycling
                          ? (event) => handleHeaderDragPointerDown(event, entry.windowData.id)
                          : undefined
                      }
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
                      showFixedPaneCloseButton={isTopCard}
                      windowData={entry.windowData}
                      zIndex={targetStackIndex + 1}
                    />
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default MobileNotesOverlay;
