import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useId,
  useMemo,
} from "react";

type MotionStyle = {
  opacity?: number;
  scale?: number;
  x?: number;
  y?: number;
};

type MotionTransition = {
  delay?: number;
  duration?: number;
  ease?: string;
};

type MotionProps = HTMLAttributes<HTMLDivElement> & {
  animate?: MotionStyle;
  children?: ReactNode;
  initial?: MotionStyle;
  transition?: MotionTransition;
};

function toTransform(style?: MotionStyle) {
  if (!style) {
    return undefined;
  }

  const x = style.x ?? 0;
  const y = style.y ?? 0;
  const scale = style.scale ?? 1;
  return `translate(${x}px, ${y}px) scale(${scale})`;
}

function resolveAnimatedStyle(style?: MotionStyle): CSSProperties {
  return {
    opacity: style?.opacity,
    transform: toTransform(style),
  };
}

function createEnterAnimationCss(
  animationName: string,
  fromStyle: MotionStyle,
  toStyle: MotionStyle,
) {
  const from = resolveAnimatedStyle(fromStyle);
  const to = resolveAnimatedStyle(toStyle);

  return `
@keyframes ${animationName} {
  from {
    opacity: ${from.opacity ?? 1};
    transform: ${from.transform ?? "translate(0px, 0px) scale(1)"};
  }

  to {
    opacity: ${to.opacity ?? 1};
    transform: ${to.transform ?? "translate(0px, 0px) scale(1)"};
  }
}`;
}

const MotionDiv = forwardRef<HTMLDivElement, MotionProps>(function MotionDiv(
  { animate, children, initial, style, transition, ...props },
  ref,
) {
  const animationName = `motion-enter-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const shouldRunEnterAnimation = Boolean(initial && animate);

  const composedStyle = useMemo<CSSProperties>(() => {
    const easing = transition?.ease === "easeOut" ? "cubic-bezier(0.16, 1, 0.3, 1)" : "ease";
    const targetStyle = animate ?? initial;

    return {
      opacity: targetStyle?.opacity,
      transform: toTransform(targetStyle),
      animationDelay:
        shouldRunEnterAnimation ? `${transition?.delay ?? 0}s` : undefined,
      animationDuration:
        shouldRunEnterAnimation ? `${transition?.duration ?? 0.25}s` : undefined,
      animationFillMode: shouldRunEnterAnimation ? "both" : undefined,
      animationName: shouldRunEnterAnimation ? animationName : undefined,
      animationTimingFunction: shouldRunEnterAnimation ? easing : undefined,
      transitionDuration: `${transition?.duration ?? 0.25}s`,
      transitionDelay: `${transition?.delay ?? 0}s`,
      transitionTimingFunction: easing,
      transitionProperty: "opacity, transform",
      ...style,
    };
  }, [animate, animationName, initial, shouldRunEnterAnimation, style, transition]);

  const enterAnimationCss =
    shouldRunEnterAnimation && animate && initial
      ? createEnterAnimationCss(animationName, initial, animate)
      : null;

  return (
    <div ref={ref} style={composedStyle} {...props}>
      {enterAnimationCss ? <style>{enterAnimationCss}</style> : null}
      {children}
    </div>
  );
});

export const motion = {
  div: MotionDiv,
};
