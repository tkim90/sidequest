import { useState } from "react";
import { motion } from "motion/react";

const STARTER_QUESTIONS = [
  "Write a poem about history and science.",
  "What was Dijkstra known for?",
  "Give me a random Jean Sartre quote.",
] as const;

interface NotebookStampProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

function NotebookStamp({
  className,
  orientation = "horizontal",
}: NotebookStampProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 220 170"
    >
      <g
        transform={
          orientation === "vertical"
            ? "translate(72 194) rotate(-90)"
            : undefined
        }
      >
        <path
          d="M25 15C31 20 37 20 43 15C49 10 55 10 61 15C67 20 73 20 79 15C85 10 91 10 97 15C103 20 109 20 115 15C121 10 127 10 133 15C139 20 145 20 151 15C157 10 163 10 169 15C175 20 181 20 187 15V155C181 150 175 150 169 155C163 160 157 160 151 155C145 150 139 150 133 155C127 160 121 160 115 155C109 150 103 150 97 155C91 160 85 160 79 155C73 150 67 150 61 155C55 160 49 160 43 155C37 150 31 150 25 155V15Z"
          className="fill-paper-sheet/80 stroke-paper-stroke/50"
          strokeWidth="2"
        />
        <path
          d="M54 47L148 47"
          className="stroke-paper-stroke/42"
          strokeLinecap="round"
          strokeWidth="2.6"
        />
        <path
          d="M54 68L166 68"
          className="stroke-paper-stroke/30"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M54 89L154 89"
          className="stroke-paper-stroke/36"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M54 112L136 112"
          className="stroke-paper-stroke/28"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}

interface EmptyNoteBackgroundProps {
  isFixedPane: boolean;
  onStarterQuestionClick: (question: string) => void | Promise<void>;
}

export default function EmptyNoteBackground({
  isFixedPane,
  onStarterQuestionClick,
}: EmptyNoteBackgroundProps) {
  const [hoveredStarterQuestion, setHoveredStarterQuestion] = useState<string | null>(null);

  return (
    <section
      className={[
        "relative my-auto isolate overflow-hidden",
        "min-h-[360px] px-4 py-8"
      ].join(" ")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent, transparent 11px, var(--paper-rule) 11px, transparent 12px)",
          backgroundSize: "100% 28px",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      />
      <NotebookStamp
        className="pointer-events-none absolute left-[12%] top-[18%] z-10 h-[200px] w-[150px] -rotate-[8deg] text-paper-stroke/60"
        orientation="vertical"
      />
      <NotebookStamp
        className="pointer-events-none absolute bottom-[16%] right-[10%] z-10 h-[150px] w-[210px] rotate-[7deg] text-paper-stroke/60"
        orientation="horizontal"
      />
      <div className="relative z-20 flex min-h-full flex-col items-center justify-center">
        {STARTER_QUESTIONS.map((question, index) => (
          <motion.div
            key={question}
            animate={{ y: hoveredStarterQuestion === question ? -6 : 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            onMouseEnter={() => setHoveredStarterQuestion(question)}
            onMouseLeave={() => setHoveredStarterQuestion((current) => (
              current === question ? null : current
            ))}
          >
            <button
              className={[
                "block cursor-pointer bg-transparent px-3 py-2 text-center font-serif text-[24px] leading-[1.35] text-foreground transition-colors duration-500 ease-out hover:text-paper-ink-soft",
                index > 0 ? "mt-2" : "",
                isFixedPane ? "max-w-[28ch]" : "max-w-[24ch]",
              ].join(" ")}
              type="button"
              onClick={() => {
                void onStarterQuestionClick(question);
              }}
            >
              {question}
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
