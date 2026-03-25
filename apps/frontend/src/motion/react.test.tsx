import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  motion,
  resolveMotionRenderState,
  resolveStableMotionId,
  sanitizeMotionId,
} from "./react";

describe("motion id helpers", () => {
  it("sanitizes React ids for CSS animation names", () => {
    expect(sanitizeMotionId(":r1:")).toBe("r1");
  });

  it("keeps the first generated motion id across keyed reorders", () => {
    const initialId = resolveStableMotionId(null, ":r1:");

    expect(resolveStableMotionId(initialId, ":r2:")).toBe(initialId);
  });
});

describe("motion.div", () => {
  it("renders enter animation styles for a newly mounted element", () => {
    const markup = renderToStaticMarkup(
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        child note
      </motion.div>,
    );

    expect(markup).toContain("animation-name:motion-enter-");
    expect(markup).toContain("animation-duration:0.22s");
    expect(markup).toContain("@keyframes motion-enter-");
    expect(markup).toContain("translate(0px, 10px) scale(0.96)");
    expect(markup).toContain("translate(0px, 0px) scale(1)");
  });
});

describe("resolveMotionRenderState", () => {
  it("emits enter animation props before the first animation completes", () => {
    const result = resolveMotionRenderState({
      animate: { opacity: 1, scale: 1, y: 0 },
      animationName: "motion-enter-note",
      enterAnimationCompleted: false,
      initial: { opacity: 0, scale: 0.96, y: 10 },
      transition: { duration: 0.22, ease: "easeOut" },
    });

    expect(result.shouldRunEnterAnimation).toBe(true);
    expect(result.composedStyle.animationName).toBe("motion-enter-note");
    expect(result.composedStyle.animationDuration).toBe("0.22s");
    expect(result.enterAnimationCss).toContain("@keyframes motion-enter-note");
  });

  it("drops enter animation props after the first animation completes", () => {
    const result = resolveMotionRenderState({
      animate: { opacity: 1, scale: 1, y: 0 },
      animationName: "motion-enter-note",
      enterAnimationCompleted: true,
      initial: { opacity: 0, scale: 0.96, y: 10 },
      transition: { duration: 0.22, ease: "easeOut" },
    });

    expect(result.shouldRunEnterAnimation).toBe(false);
    expect(result.composedStyle.animationName).toBeUndefined();
    expect(result.composedStyle.animationDuration).toBeUndefined();
    expect(result.composedStyle.transform).toBe("translate(0px, 0px) scale(1)");
    expect(result.composedStyle.transitionProperty).toBe("opacity, transform");
    expect(result.enterAnimationCss).toBeNull();
  });
});
