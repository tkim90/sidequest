import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
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

export function sanitizeMotionId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function resolveStableMotionId(
  stableId: string | null,
  nextReactId: string,
): string {
  return stableId ?? sanitizeMotionId(nextReactId);
}

interface ResolveMotionRenderStateOptions {
  animate?: MotionStyle;
  animationName: string;
  enterAnimationCompleted: boolean;
  initial?: MotionStyle;
  style?: CSSProperties;
  transition?: MotionTransition;
}

interface MotionRenderState {
  composedStyle: CSSProperties;
  enterAnimationCss: string | null;
  shouldRunEnterAnimation: boolean;
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

export function resolveMotionRenderState({
  animate,
  animationName,
  enterAnimationCompleted,
  initial,
  style,
  transition,
}: ResolveMotionRenderStateOptions): MotionRenderState {
  const shouldRunEnterAnimation = Boolean(
    initial && animate && !enterAnimationCompleted,
  );
  const easing =
    transition?.ease === "easeOut"
      ? "cubic-bezier(0.16, 1, 0.3, 1)"
      : "ease";
  const targetStyle = animate ?? initial;

  return {
    composedStyle: {
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
    },
    enterAnimationCss:
      shouldRunEnterAnimation && animate && initial
        ? createEnterAnimationCss(animationName, initial, animate)
        : null,
    shouldRunEnterAnimation,
  };
}

const MotionDiv = forwardRef<HTMLDivElement, MotionProps>(function MotionDiv(
  { animate, children, initial, onAnimationEnd, style, transition, ...props },
  ref,
) {
  const reactId = useId();
  const stableMotionIdRef = useRef<string | null>(null);
  const [enterAnimationCompleted, setEnterAnimationCompleted] = useState(false);
  const stableMotionId = resolveStableMotionId(
    stableMotionIdRef.current,
    reactId,
  );
  stableMotionIdRef.current = stableMotionId;
  const animationName = `motion-enter-${stableMotionId}`;
  const { composedStyle, enterAnimationCss, shouldRunEnterAnimation } =
    useMemo(
      () =>
        resolveMotionRenderState({
          animate,
          animationName,
          enterAnimationCompleted,
          initial,
          style,
          transition,
        }),
      [
        animate,
        animationName,
        enterAnimationCompleted,
        initial,
        style,
        transition,
      ],
    );

  const handleAnimationEnd = useCallback<NonNullable<MotionProps["onAnimationEnd"]>>(
    (event) => {
      if (
        shouldRunEnterAnimation &&
        event.currentTarget === event.target &&
        event.animationName === animationName
      ) {
        setEnterAnimationCompleted(true);
      }

      onAnimationEnd?.(event);
    },
    [animationName, onAnimationEnd, shouldRunEnterAnimation],
  );

  return (
    <div
      ref={ref}
      style={composedStyle}
      onAnimationEnd={handleAnimationEnd}
      {...props}
    >
      {enterAnimationCss ? <style>{enterAnimationCss}</style> : null}
      {children}
    </div>
  );
});

export const motion = {
  div: MotionDiv,
};
