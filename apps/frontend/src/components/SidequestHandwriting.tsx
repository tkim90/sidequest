import {
  useId,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

import { useMountEffect } from "../hooks/useMountEffect";

export interface SidequestHandwritingProps {
  className?: string;
  color?: string;
  width?: number | string;
  height?: number | string;
  duration?: number;
  respectReducedMotion?: boolean;
}

interface StrokeDefinition {
  key: string;
  d: string;
  start: number;
  span: number;
  transform?: string;
}

const VIEW_BOX = "0 0 69.591225 31.506756";
const GROUP_TRANSFORM = "translate(-2.241694,-2.5051657)";

const STROKES: readonly StrokeDefinition[] = [
  {
    key: "path227",
    d: "m 53.219048,116.71905 c -0.993486,-1.26518 -2.16597,-2.3896 -3.471613,-3.32928 -1.566699,-1.12757 -3.341687,-1.9935 -5.234379,-2.37254 -1.892692,-0.37905 -3.907052,-0.25385 -5.680535,0.50819 -0.621447,0.26703 -1.219168,0.61679 -1.678931,1.11289 -0.459763,0.4961 -0.771859,1.15234 -0.758184,1.82859 0.01145,0.56606 0.250572,1.11464 0.61302,1.54959 0.362448,0.43496 0.842415,0.76175 1.356891,0.99811 1.028952,0.47272 2.178495,0.59162 3.281768,0.84655 2.296074,0.53056 4.410832,1.65929 6.3942,2.93196 1.983367,1.27268 3.866145,2.70053 5.88617,3.91417 0.763068,0.45846 1.551583,0.89064 2.213486,1.48591 0.330951,0.29763 0.62845,0.63561 0.856486,1.01786 0.228036,0.38225 0.385436,0.81002 0.430282,1.25285 0.06167,0.60895 -0.09361,1.23147 -0.398572,1.76215 -0.304961,0.53068 -0.754682,0.97139 -1.2696,1.30227 -0.831869,0.53454 -1.820599,0.78313 -2.805555,0.87036 -0.984955,0.0872 -1.976106,0.0214 -2.963739,-0.0268 -3.291425,-0.16073 -6.617766,-0.12845 -9.837532,-0.83018 -1.007188,-0.21951 -2.019806,-0.51994 -2.862231,-1.11403 -0.421212,-0.29704 -0.794987,-0.66644 -1.069987,-1.10236 -0.274999,-0.43593 -0.448883,-0.93982 -0.469325,-1.45483 -0.02044,-0.51505 0.114744,-1.03527 0.383356,-1.47521",
    start: 0,
    span: 0.24,
    transform: "translate(-33.157435,-107.95461)",
  },
  {
    key: "path229",
    d: "m 63.499999,122.1619 c -0.726936,1.40605 -1.007067,3.03893 -0.790335,4.60687 0.05999,0.43399 0.158661,0.86766 0.354951,1.25934 0.19629,0.39169 0.497321,0.74097 0.888957,0.93736 0.479651,0.24053 1.041383,0.23285 1.577592,0.21292 0.431875,-0.0161 0.863582,-0.0366 1.295026,-0.0617",
    start: 0.18,
    span: 0.1,
    transform: "translate(-37.220325,-105.17996)",
  },
  {
    key: "path251",
    d: "m 63.197617,119.28928 0.151191,0.75596",
    start: 0.25,
    span: 0.08,
    transform: "translate(-37.220325,-105.17996)",
  },
  {
    key: "path254",
    d: "m 73.327381,106.74047 c -0.548303,5.29705 -0.210412,10.68477 0.995403,15.87181 0.163373,0.70278 0.343869,1.41722 0.284087,2.13626 -0.02989,0.35951 -0.121551,0.71693 -0.296356,1.03251 -0.174804,0.31558 -0.435703,0.58782 -0.758332,0.74925 -0.249262,0.12471 -0.530582,0.18119 -0.809235,0.17507 -0.278654,-0.006 -0.554537,-0.0739 -0.809783,-0.18583 -0.510491,-0.22392 -0.930439,-0.61826 -1.271456,-1.05922 -0.453853,-0.58687 -0.789709,-1.2878 -0.829733,-2.0286 -0.02001,-0.37041 0.03518,-0.74655 0.176855,-1.08937 0.141673,-0.34282 0.371218,-0.65128 0.669356,-0.87199 0.494571,-0.36612 1.160416,-0.46909 1.757932,-0.32204 0.597516,0.14706 1.124286,0.52924 1.496563,1.0192 0.485283,0.63869 0.709886,1.43068 0.994984,2.18044 0.142549,0.37489 0.303349,0.74515 0.520702,1.08222 0.217353,0.33706 0.494054,0.64138 0.835208,0.85226 0.504924,0.31211 1.126476,0.40153 1.715688,0.32948 0.589212,-0.0721 1.150563,-0.29598 1.675911,-0.57233 0.474884,-0.24981 0.930201,-0.5471 1.304956,-0.93113 0.374754,-0.38403 0.666735,-0.86019 0.776458,-1.38544 0.109722,-0.52524 0.02455,-1.10043 -0.285114,-1.53864 -0.154832,-0.2191 -0.363312,-0.40122 -0.604911,-0.51789 -0.241599,-0.11666 -0.516146,-0.16672 -0.782527,-0.13477 -0.241041,0.0289 -0.472724,0.12431 -0.669298,0.26678 -0.196575,0.14246 -0.358251,0.3312 -0.476347,0.5433 -0.236192,0.42422 -0.293835,0.93289 -0.222743,1.41319 0.09292,0.62779 0.39792,1.21539 0.823427,1.68624 0.425507,0.47084 0.967675,0.8283 1.550361,1.07975 0.91646,0.39549 1.932815,0.53288 2.929231,0.47402 0.996415,-0.0589 1.974876,-0.30922 2.908751,-0.66163 0.62679,-0.23652 1.236117,-0.5193 1.821389,-0.84528",
    start: 0.26,
    span: 0.18,
    transform: "translate(-40.78774,-103.19806)",
  },
  {
    key: "path262",
    d: "m 94.452143,125.15004 c 0.215555,-1.90319 0.431109,-3.80637 -0.267479,-4.73277 -0.698587,-0.9264 -2.311251,-0.876 -3.218396,-0.14524 -0.907145,0.73077 -1.10873,2.14186 -0.755943,3.0742 0.352787,0.93235 1.259913,1.38591 2.116667,1.38591 0.856754,-1e-5 1.66307,-0.45356 2.015855,0.90718 0.352785,1.36075 0.251994,4.53568 0.478783,6.62716 0.22679,2.09147 0.781145,3.09939 1.637903,3.60336 0.856758,0.50397 2.015864,0.50397 2.595427,0.12598 0.579563,-0.37798 0.579563,-1.13392 0.579563,-1.88987",
    start: 0.41,
    span: 0.14,
    transform: "translate(-46.337054,-102.60349)",
  },
  {
    key: "path263",
    d: "m 97.215475,119.44047 c -0.0504,1.91508 -0.100794,3.83016 0.428384,4.93889 0.529177,1.10874 1.637885,1.41112 2.444241,1.36072 0.80635,-0.0504 1.31031,-0.45357 1.5371,-1.53712 0.22678,-1.08355 0.17639,-2.84741 0.12599,-4.61129",
    start: 0.52,
    span: 0.08,
    transform: "translate(-47.625287,-102.00892)",
  },
  {
    key: "path264",
    d: "m 103.41429,122.61547 c 1.5119,-0.50397 3.0238,-1.00793 3.47737,-1.7387 0.45356,-0.73076 -0.15119,-1.68828 -0.78115,-1.96546 -0.62997,-0.27718 -1.28511,0.12599 -1.83948,0.60476 -0.55437,0.47878 -1.00794,1.03314 -1.20953,1.7387 -0.20158,0.70556 -0.15119,1.56229 0.1764,2.39385 0.32758,0.83155 0.93234,1.63789 1.81429,1.78908 0.88196,0.15118 2.04106,-0.35278 2.74662,-0.73076 0.70556,-0.37798 0.95754,-0.62996 1.20952,-0.88194",
    start: 0.58,
    span: 0.11,
    transform: "translate(-47.625287,-102.00892)",
  },
  {
    key: "path265",
    d: "m 114.95006,120.0039 c -0.59457,-0.72669 -1.18914,-1.45339 -2.04797,-1.6681 -0.85883,-0.2147 -1.98189,0.0826 -2.47736,0.56155 -0.49547,0.47896 -0.36335,1.13958 0.0495,1.66809 0.41291,0.52851 1.10656,0.92488 1.76719,1.22217 0.66064,0.29728 1.28823,0.49547 1.71764,0.99096 0.42942,0.49548 0.66064,1.28822 0.46244,1.91583 -0.1982,0.6276 -0.82578,1.09003 -1.61855,1.22216 -0.79277,0.13213 -1.75067,-0.0661 -2.24615,-0.39638 -0.49547,-0.33032 -0.52851,-0.79276 -0.56154,-1.2552",
    start: 0.66,
    span: 0.09,
    transform: "translate(-48.913521,-102.20711)",
  },
  {
    key: "path266",
    d: "m 116.83286,110.09441 c 0,2.24615 0,4.4923 0.0826,6.62286 0.0826,2.13056 0.24774,4.14545 0.72671,5.66491 0.47896,1.51947 1.27171,2.54343 2.04796,2.92329 0.77625,0.37986 1.53596,0.11562 1.7837,-0.42941 0.24773,-0.54503 -0.0165,-1.37081 -0.28077,-2.1966",
    start: 0.75,
    span: 0.1,
    transform: "translate(-50.102659,-102.10801)",
  },
  {
    key: "path267",
    d: "m 113.56273,113.95911 c 2.18009,-0.0991 4.36018,-0.19819 6.54026,-0.29728",
    start: 0.85,
    span: 0.07,
    transform: "translate(-50.102659,-102.10801)",
  },
] as const;

function formatSeconds(value: number) {
  return `${value.toFixed(3)}s`;
}

function subscribeToReducedMotion(onStoreChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }

  const mediaQueryList = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQueryList.addEventListener("change", onStoreChange);

  return () => {
    mediaQueryList.removeEventListener("change", onStoreChange);
  };
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
}

function resolveInitialStrokeStyle(isAnimated: boolean, shouldReduceMotion: boolean): CSSProperties {
  if (shouldReduceMotion) {
    return {
      opacity: 1,
      strokeDashoffset: 0,
    };
  }

  if (isAnimated) {
    return {
      opacity: 0,
      strokeDashoffset: 1,
    };
  }

  return {
    opacity: 0,
    strokeDashoffset: 1,
  };
}

function HandwritingStrokeGroup({
  duration,
  shouldReduceMotion,
}: {
  duration: number;
  shouldReduceMotion: boolean;
}) {
  const [isAnimated, setIsAnimated] = useState(false);

  useMountEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsAnimated(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  });

  return (
    <g
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={0.7}
      transform={GROUP_TRANSFORM}
    >
      {STROKES.map((stroke) => (
        <path
          key={stroke.key}
          className="sidequest-handwriting__stroke"
          d={stroke.d}
          data-sidequest-handwriting-stroke={stroke.key}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1}
          style={resolveInitialStrokeStyle(isAnimated, shouldReduceMotion)}
          transform={stroke.transform}
        >
          {isAnimated && !shouldReduceMotion ? (
            <>
              <animate
                attributeName="opacity"
                begin={formatSeconds(duration * stroke.start)}
                dur="0.001s"
                fill="freeze"
                from="0"
                to="1"
              />
              <animate
                attributeName="stroke-dashoffset"
                begin={formatSeconds(duration * stroke.start)}
                calcMode="spline"
                dur={formatSeconds(duration * stroke.span)}
                fill="freeze"
                from="1"
                keySplines="0.65 0 0.35 1"
                keyTimes="0;1"
                to="0"
              />
            </>
          ) : null}
        </path>
      ))}
    </g>
  );
}

/**
 * Usage:
 * <SidequestHandwriting className="text-stone-600" width={320} duration={2.1} />
 */
export default function SidequestHandwriting({
  className,
  color,
  width,
  height,
  duration = 2.1,
  respectReducedMotion = true,
}: SidequestHandwritingProps) {
  const scopeId = `sidequest-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldReduceMotion = respectReducedMotion && prefersReducedMotion;

  const svgStyle: CSSProperties = {
    color,
    display: "block",
    height: height ?? "auto",
    width: width ?? (height ? "auto" : 320),
  };

  const css = `
${respectReducedMotion ? `
@media (prefers-reduced-motion: reduce) {
  [data-sidequest-handwriting="${scopeId}"] .sidequest-handwriting__stroke {
    opacity: 1 !important;
    stroke-dashoffset: 0 !important;
  }
}
` : ""}
`;

  return (
    <svg
      aria-label="Sidequest"
      className={className}
      data-sidequest-handwriting={scopeId}
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      style={svgStyle}
      viewBox={VIEW_BOX}
    >
      <style>{css}</style>
      <HandwritingStrokeGroup
        key={shouldReduceMotion ? "reduced-motion" : "animated"}
        duration={duration}
        shouldReduceMotion={shouldReduceMotion}
      />
    </svg>
  );
}
