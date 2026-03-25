import { describe, expect, it } from "vitest";

import type { FloatingWindowPresenceEntry } from "../../hooks/useFloatingWindowPresence";
import {
  resolveNextSwipeCycle,
  resolveStackCardPose,
  resolveStackCycleTargetIndex,
  resolveNewestWindowId,
  resolveSwipeShouldAdvance,
} from "./MobileNotesOverlay";

function createEntry(windowId: string): FloatingWindowPresenceEntry {
  return {
    enterKind: "branch",
    isExiting: false,
    messages: [],
    savedScrollState: {
      scrollTop: null,
      shouldAutoScroll: true,
    },
    windowData: {
      id: windowId,
      title: `Window ${windowId}`,
      x: 0,
      y: 0,
      width: 320,
      height: 420,
      parentId: "root",
      childIds: [],
      branchAnchorId: null,
      branchFocus: null,
      inheritedMessageCount: 0,
      isHistoryExpanded: false,
      composer: "",
      selectedModel: null,
      selectedEffort: null,
      isStreaming: false,
    },
    zIndex: 1,
  };
}

describe("MobileNotesOverlay helpers", () => {
  it("advances swipe only when horizontal offset crosses the 50% stage-width threshold", () => {
    expect(
      resolveSwipeShouldAdvance({
        offsetX: 300,
        stageWidth: 600,
        velocityX: 100,
      }),
    ).toBe(true);
    expect(
      resolveSwipeShouldAdvance({
        offsetX: 299,
        stageWidth: 600,
        velocityX: 900,
      }),
    ).toBe(false);
  });

  it("does not advance from velocity alone below the offset threshold", () => {
    expect(
      resolveSwipeShouldAdvance({
        offsetX: 40,
        stageWidth: 600,
        velocityX: 600,
      }),
    ).toBe(false);
  });

  it("resolves a swipe cycle with a clearing phase and off-stack clear point", () => {
    const orderedEntries = [createEntry("A"), createEntry("B"), createEntry("C")];
    const transition = resolveNextSwipeCycle(orderedEntries, "left", -320, 36, 620);

    expect(transition).toMatchObject({
      direction: "left",
      nextWindowId: "B",
      outgoingWindowId: "A",
      phase: "clearing",
      releaseOffsetX: -320,
      releaseOffsetY: 36,
      clearOffsetX: -644,
    });
    expect(transition?.clearOffsetY ?? 0).toBeCloseTo(4.32, 6);
  });

  it("returns no swipe cycle when there is only one visible card", () => {
    expect(resolveNextSwipeCycle([createEntry("A")], "left", -320, 24, 620)).toBeNull();
    expect(resolveNextSwipeCycle([createEntry("A")], "right", 320, -24, 620)).toBeNull();
  });

  it("uses the last unseen window id when multiple new cards appear", () => {
    expect(
      resolveNewestWindowId(
        ["A", "B", "C", "D"],
        ["A", "B"],
      ),
    ).toBe("D");
  });

  it("maps a three-card cycle from front to back and promotes the following cards", () => {
    expect(resolveStackCycleTargetIndex(0, 3)).toBe(2);
    expect(resolveStackCycleTargetIndex(1, 3)).toBe(0);
    expect(resolveStackCycleTargetIndex(2, 3)).toBe(1);
  });

  it("returns stack poses that keep behind cards visibly peeking at rest", () => {
    const top = resolveStackCardPose({
      stackIndex: 0,
      direction: "left",
      isCycling: false,
      isOutgoing: false,
      stageWidth: 620,
      visibleCardCount: 3,
    });
    const second = resolveStackCardPose({
      stackIndex: 1,
      direction: "left",
      isCycling: false,
      isOutgoing: false,
      stageWidth: 620,
      visibleCardCount: 3,
    });
    const third = resolveStackCardPose({
      stackIndex: 2,
      direction: "left",
      isCycling: false,
      isOutgoing: false,
      stageWidth: 620,
      visibleCardCount: 3,
    });

    expect(Number(second.x ?? 0)).toBeGreaterThan(Number(top.x ?? 0));
    expect(Number(second.y ?? 0)).toBeGreaterThan(Number(top.y ?? 0));
    expect(Number(second.scale ?? 1)).toBeLessThan(Number(top.scale ?? 1));
    expect(Number(third.x ?? 0)).toBeGreaterThan(Number(second.x ?? 0));
    expect(Number(third.y ?? 0)).toBeGreaterThan(Number(second.y ?? 0));
    expect(Number(third.scale ?? 1)).toBeLessThan(Number(second.scale ?? 1));
  });

  it("returns an outgoing clearing pose that fully exits past the stage edge", () => {
    const outgoing = resolveStackCardPose({
      clearOffsetX: -644,
      clearOffsetY: 6,
      cyclePhase: "clearing",
      stackIndex: 0,
      direction: "left",
      isCycling: true,
      isOutgoing: true,
      releaseOffsetX: -320,
      releaseOffsetY: -22,
      stageWidth: 620,
      visibleCardCount: 3,
    });

    expect(outgoing.x).toEqual([-320, -644]);
    expect(outgoing.y).toEqual([-22, 6]);
    expect(outgoing.scale).toEqual([1, 0.985]);
    expect(outgoing.opacity).toEqual([1, 1]);
  });

  it("returns an outgoing return pose that comes back to the fixed rear slot", () => {
    const outgoing = resolveStackCardPose({
      clearOffsetX: 644,
      clearOffsetY: 4,
      cyclePhase: "returning",
      stackIndex: 0,
      direction: "right",
      isCycling: true,
      isOutgoing: true,
      releaseOffsetX: 320,
      releaseOffsetY: 12,
      stageWidth: 620,
      visibleCardCount: 3,
    });

    expect(outgoing.x).toEqual([644, 0, 26]);
    expect(outgoing.y).toEqual([4, 10.2, 34]);
    expect(outgoing.scale).toEqual([0.985, 0.955, 0.93]);
    expect(outgoing.opacity).toEqual([0.98, 0.94, 0.86]);
  });

  it("mirrors the exit direction but keeps the same final rear slot", () => {
    const rightOutgoing = resolveStackCardPose({
      clearOffsetX: 644,
      clearOffsetY: 4,
      cyclePhase: "returning",
      stackIndex: 0,
      direction: "right",
      isCycling: true,
      isOutgoing: true,
      stageWidth: 620,
      visibleCardCount: 3,
    });
    const leftOutgoing = resolveStackCardPose({
      clearOffsetX: -644,
      clearOffsetY: 4,
      cyclePhase: "returning",
      stackIndex: 0,
      direction: "left",
      isCycling: true,
      isOutgoing: true,
      stageWidth: 620,
      visibleCardCount: 3,
    });
    const promotedCard = resolveStackCardPose({
      cyclePhase: "clearing",
      stackIndex: 1,
      direction: "left",
      isCycling: true,
      isOutgoing: false,
      stageWidth: 620,
      visibleCardCount: 3,
    });

    expect(resolveNextSwipeCycle([createEntry("A"), createEntry("B")], "right", 320, 12, 620))
      .toMatchObject({ nextWindowId: "B", outgoingWindowId: "A", clearOffsetX: 644 });
    expect(resolveNextSwipeCycle([createEntry("A"), createEntry("B")], "left", -320, 12, 620))
      .toMatchObject({ nextWindowId: "B", outgoingWindowId: "A", clearOffsetX: -644 });
    expect(rightOutgoing.x).toEqual([644, 0, 26]);
    expect(leftOutgoing.x).toEqual([-644, 0, 26]);
    expect(promotedCard.x).toEqual([14, 0]);
    expect(promotedCard.y).toEqual([18, 0]);
  });
});
