import { eyebrowClassName } from "./ui";

function WorkspaceHeader() {
  return (
    <div className="flex flex-col gap-4 border-b border-zinc-300 px-5 py-5 lg:flex-row lg:items-end lg:justify-between lg:px-6">
      <div>
        <p className={eyebrowClassName}>Sidequest</p>
        <h1 className="mt-2 max-w-4xl text-3xl font-medium tracking-tight text-zinc-950 md:text-4xl">
          Branch the phrase, not the whole thread.
        </h1>
      </div>
      <p className="max-w-xl text-sm leading-6 text-zinc-600 lg:text-right">
        Drag windows by the header. Drag the empty board to pan. Hold
        <span className="mx-1 inline-block border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-zinc-800">
          Cmd/Ctrl
        </span>
        while scrolling to zoom.
      </p>
    </div>
  );
}

export default WorkspaceHeader;
