import { motion } from "motion/react";

import {
  eyebrowClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./ui";

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
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-6 border-b border-border bg-background px-5 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)_auto] lg:items-end lg:px-7"
      initial={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="flex flex-wrap gap-3 lg:justify-end">
        <button
          className={primaryButtonClassName}
          type="button"
          onClick={onOpenFreshRootWindow}
        >
          New root window
        </button>
        <button
          className={secondaryButtonClassName}
          disabled={!hasChildWindows}
          type="button"
          onClick={onCloseAllChildWindows}
        >
          Close forked windows
        </button>
      </div>
    </motion.div>
  );
}

export default WorkspaceHeader;
