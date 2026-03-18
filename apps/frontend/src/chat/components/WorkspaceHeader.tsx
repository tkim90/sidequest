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
  return null;
}

export default WorkspaceHeader;
