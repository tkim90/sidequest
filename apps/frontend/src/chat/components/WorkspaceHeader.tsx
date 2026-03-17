import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./ui";
import { motion } from "motion/react";

interface WorkspaceHeaderProps {
  hasChildWindows: boolean;
  onCloseAllChildWindows: () => void;
  onOpenFreshRootWindow: () => void;
}

function WorkspaceHeader({
  hasChildWindows,
  onCloseAllChildWindows,
  onOpenFreshRootWindow,
}: WorkspaceHeaderProps) {
  return (
    <motion.div
      animate={{ opacity: 1, x: 0 }}
      className="flex h-full flex-col gap-7 px-7 py-8"
      initial={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="space-y-4">
        <p className="text-xs tracking-wide text-[#9a9a9a]">
          sidequest / branching conversation notebook
        </p>
        <h1 className="font-serif text-5xl leading-tight tracking-tight text-foreground">
          The weight of words
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-foreground/90">
          A calm workspace for branching ideas. Select any sentence to fork a
          child window, then arrange thought fragments on the canvas as if they
          were notes pinned on a paper desk.
        </p>
      </div>

      <div className="space-y-4 border-y border-border py-6">
        <p className="font-serif text-xl text-foreground">How it works</p>
        <p className="max-w-xl text-base leading-relaxed text-foreground/90">
          Each window carries context from its parent. Fork freely, compare
          alternatives, and gather your strongest output before publishing.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className={primaryButtonClassName}
          type="button"
          onClick={onOpenFreshRootWindow}
        >
          New root window
        </button>
        <button
          className={secondaryButtonClassName}
          type="button"
          disabled={!hasChildWindows}
          onClick={onCloseAllChildWindows}
        >
          Close forked windows
        </button>
      </div>

      <div className="relative mt-2 rounded-sm border border-border/80 bg-transparent p-8 text-center">
        <p className="font-serif text-3xl italic text-foreground/75">
          select text to fork
        </p>
        <p className="mt-2 text-sm tracking-wide text-[#9a9a9a]">
          a new floating window appears on the right canvas
        </p>
      </div>
    </motion.div>
  );
}

export default WorkspaceHeader;
