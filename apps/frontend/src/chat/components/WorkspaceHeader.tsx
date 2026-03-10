import {
  eyebrowClassName,
  secondaryButtonClassName,
} from "./ui";

interface WorkspaceHeaderProps {
  hasChildWindows: boolean;
  onCloseAllChildWindows: () => void;
}

function WorkspaceHeader({
  hasChildWindows,
  onCloseAllChildWindows,
}: WorkspaceHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border px-5 py-5 lg:flex-row lg:items-end lg:justify-between lg:px-6">
      <div>
        <p className={eyebrowClassName}>Sidequest</p>
        <h1 className="mt-2 max-w-4xl text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          Fork a conversation by selecting text.
        </h1>
      </div>
      <button
        className={secondaryButtonClassName}
        type="button"
        disabled={!hasChildWindows}
        onClick={onCloseAllChildWindows}
      >
        Close all child windows
      </button>
    </div>
  );
}

export default WorkspaceHeader;
