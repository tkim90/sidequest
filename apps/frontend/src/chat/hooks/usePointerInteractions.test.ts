import { describe, expect, it } from "vitest";

import {
  computeReleaseVelocity,
  shouldStartMomentum,
  stepMomentumFrame,
} from "./usePointerInteractions";

describe("computeReleaseVelocity", () => {
  it("returns zero velocity when there are not enough separated samples", () => {
    expect(
      computeReleaseVelocity(
        [
          { clientX: 10, clientY: 20, timeMs: 100 },
          { clientX: 30, clientY: 40, timeMs: 110 },
        ],
        1,
      ),
    ).toEqual({ vx: 0, vy: 0 });
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

describe("shouldStartMomentum", () => {
  it("starts only when the speed reaches the inertia threshold", () => {
    expect(shouldStartMomentum(89.99)).toBe(false);
    expect(shouldStartMomentum(90)).toBe(true);
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
    expect(nextFrame.vx).toBeCloseTo(175.97067582892876, 6);
    expect(nextFrame.vy).toBeCloseTo(-87.98533791446438, 6);
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
    expect(nextFrame.vx).toBeCloseTo(-119.66005956367157, 6);
    expect(nextFrame.vy).toBeCloseTo(87.98533791446438, 6);
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
    expect(nextFrame.vy).toBeCloseTo(17.597067582892876, 6);
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
    expect(nextFrame.vx).toBeCloseTo(9.28970362550698, 6);
    expect(nextFrame.vy).toBeCloseTo(6.193135750337986, 6);
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
    expect(nextFrame.vx).toBeCloseTo(-119.66005956367157, 6);
    expect(nextFrame.vy).toBeCloseTo(-89.74504467275368, 6);
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
