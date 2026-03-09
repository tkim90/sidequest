function WorkspaceHeader() {
  return (
    <div className="workspace-header">
      <div>
        <p className="workspace-header__eyebrow">Sidequest</p>
        <h1>Branch the phrase, not the whole thread.</h1>
      </div>
      <p className="workspace-header__hint">
        Drag windows by the header. Drag the empty board to pan. Hold
        <span> Cmd/Ctrl </span>
        while scrolling to zoom.
      </p>
    </div>
  );
}

export default WorkspaceHeader;
