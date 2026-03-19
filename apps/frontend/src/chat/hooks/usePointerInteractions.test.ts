import { describe, expect, it } from "vitest";

import {
  computeReleaseVelocity,
  ensureMinimumGlideVelocity,
  stepMomentumFrame,
} from "./usePointerInteractions";

describe("computeReleaseVelocity", () => {
  it("returns zero velocity when there are not enough samples", () => {
    expect(
      computeReleaseVelocity(
        [{ clientX: 10, clientY: 20, timeMs: 100 }],
        1,
      ),
    ).toEqual({ vx: 0, vy: 0 });
  });

  it("still computes release velocity for short quick drags", () => {
    const velocity = computeReleaseVelocity(
      [
        { clientX: 10, clientY: 20, timeMs: 100 },
        { clientX: 30, clientY: 40, timeMs: 104 },
      ],
      1,
    );

    expect(Math.hypot(velocity.vx, velocity.vy)).toBeCloseTo(2200, 6);
    expect(velocity.vx).toBeCloseTo(1555.6349186104046, 6);
    expect(velocity.vy).toBeCloseTo(1555.6349186104046, 6);
  });

  it("converts trailing pointer movement into canvas-space release velocity", () => {
    const velocity = computeReleaseVelocity(
      [
        { clientX: 80, clientY: 90, timeMs: 0 },
        { clientX: 120, clientY: 130, timeMs: 10 },
        { clientX: 180, clientY: 210, timeMs: 40 },
      ],
      2,
    );

    expect(velocity.vx).toBeCloseTo(1250, 6);
    expect(velocity.vy).toBeCloseTo(1500, 6);
  });

  it("clamps extreme release speed to the configured maximum", () => {
    const velocity = computeReleaseVelocity(
      [
        { clientX: 0, clientY: 0, timeMs: 0 },
        { clientX: 1000, clientY: 1000, timeMs: 20 },
      ],
      1,
    );

    expect(Math.hypot(velocity.vx, velocity.vy)).toBeCloseTo(2200, 6);
    expect(velocity.vx).toBeCloseTo(1555.6349186104046, 6);
    expect(velocity.vy).toBeCloseTo(1555.6349186104046, 6);
  });
});

describe("ensureMinimumGlideVelocity", () => {
  it("adds a small launch velocity for slow non-zero drags", () => {
    const velocity = ensureMinimumGlideVelocity({ vx: 0, vy: 0 }, 12, 16);

    expect(velocity.vx).toBeCloseTo(28.8, 6);
    expect(velocity.vy).toBeCloseTo(38.4, 6);
  });

  it("does not add glide for tiny incidental drags", () => {
    expect(
      ensureMinimumGlideVelocity({ vx: 0, vy: 0 }, 3, 4),
    ).toEqual({ vx: 0, vy: 0 });
  });

  it("keeps faster release velocities unchanged", () => {
    expect(
      ensureMinimumGlideVelocity({ vx: 90, vy: 0 }, 12, 0),
    ).toEqual({ vx: 90, vy: 0 });
  });
});

describe("stepMomentumFrame", () => {
  it("advances position and decays velocity while inside bounds", () => {
    const nextFrame = stepMomentumFrame({
      bounds: {
        maxX: 500,
        maxY: 500,
        minX: 0,
        minY: 0,
      },
      dt: 0.016,
      vx: 200,
      vy: -100,
      x: 100,
      y: 200,
    });

    expect(nextFrame.stopped).toBe(false);
    expect(nextFrame.vx).toBeCloseTo(190.62675741550095, 6);
    expect(nextFrame.vy).toBeCloseTo(-95.31337870775047, 6);
    expect(nextFrame.x).toBeCloseTo(103.2, 6);
    expect(nextFrame.y).toBeCloseTo(198.4, 6);
  });

  it("clamps to bounds and reflects the blocked axis inward", () => {
    const nextFrame = stepMomentumFrame({
      bounds: {
        maxX: 120,
        maxY: 120,
        minX: 0,
        minY: 0,
      },
      dt: 0.016,
      vx: 400,
      vy: 100,
      x: 118,
      y: 50,
    });

    expect(nextFrame.stopped).toBe(false);
    expect(nextFrame.vx).toBeCloseTo(-129.62619504254064, 6);
    expect(nextFrame.vy).toBeCloseTo(95.31337870775047, 6);
    expect(nextFrame.x).toBe(120);
    expect(nextFrame.y).toBeCloseTo(51.6, 6);
  });

  it("stops low-speed impacts instead of bouncing them", () => {
    const nextFrame = stepMomentumFrame({
      bounds: {
        maxX: 120,
        maxY: 120,
        minX: 0,
        minY: 0,
      },
      dt: 0.016,
      vx: 40,
      vy: 20,
      x: 119.8,
      y: 40,
    });

    expect(nextFrame.stopped).toBe(true);
    expect(nextFrame.vx).toBe(0);
    expect(nextFrame.vy).toBeCloseTo(19.062675741550095, 6);
    expect(nextFrame.x).toBe(120);
    expect(nextFrame.y).toBeCloseTo(40.32, 6);
  });

  it("stops once friction reduces the remaining speed below the stop threshold", () => {
    const nextFrame = stepMomentumFrame({
      bounds: {
        maxX: 500,
        maxY: 500,
        minX: 0,
        minY: 0,
      },
      dt: 0.032,
      vx: 12,
      vy: 8,
      x: 100,
      y: 100,
    });

    expect(nextFrame.stopped).toBe(true);
    expect(nextFrame.vx).toBeCloseTo(10.901568192824474, 6);
    expect(nextFrame.vy).toBeCloseTo(7.2677121285496495, 6);
    expect(nextFrame.x).toBeCloseTo(100.384, 6);
    expect(nextFrame.y).toBeCloseTo(100.256, 6);
  });

  it("rebounds both axes on a corner hit when the reflected speeds remain high enough", () => {
    const nextFrame = stepMomentumFrame({
      bounds: {
        maxX: 120,
        maxY: 120,
        minX: 0,
        minY: 0,
      },
      dt: 0.016,
      vx: 400,
      vy: 300,
      x: 118,
      y: 119,
    });

    expect(nextFrame.stopped).toBe(false);
    expect(nextFrame.vx).toBeCloseTo(-129.62619504254064, 6);
    expect(nextFrame.vy).toBeCloseTo(-97.21964628190548, 6);
    expect(nextFrame.x).toBe(120);
    expect(nextFrame.y).toBe(120);
  });

  it("stops immediately on a corner hit when both reflected axes are too weak", () => {
    const nextFrame = stepMomentumFrame({
      bounds: {
        maxX: 120,
        maxY: 120,
        minX: 0,
        minY: 0,
      },
      dt: 0.016,
      vx: 40,
      vy: 40,
      x: 119.8,
      y: 119.8,
    });

    expect(nextFrame).toEqual({
      stopped: true,
      vx: 0,
      vy: 0,
      x: 120,
      y: 120,
    });
  });
});
