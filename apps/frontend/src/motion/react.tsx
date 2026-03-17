import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
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

const MotionDiv = forwardRef<HTMLDivElement, MotionProps>(function MotionDiv(
  { animate, initial, style, transition, ...props },
  ref,
) {
  const composedStyle = useMemo<CSSProperties>(() => {
    const easing = transition?.ease === "easeOut" ? "cubic-bezier(0.16, 1, 0.3, 1)" : "ease";

    return {
      opacity: animate?.opacity ?? initial?.opacity,
      transform: toTransform(animate ?? initial),
      transitionDuration: `${transition?.duration ?? 0.25}s`,
      transitionDelay: `${transition?.delay ?? 0}s`,
      transitionTimingFunction: easing,
      transitionProperty: "opacity, transform",
      ...style,
    };
  }, [animate, initial, style, transition]);

  return <div ref={ref} style={composedStyle} {...props} />;
});

export const motion = {
  div: MotionDiv,
};
