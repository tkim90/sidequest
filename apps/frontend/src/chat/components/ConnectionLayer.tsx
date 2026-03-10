import type { ConnectorPath } from "../../types";

interface ConnectionLayerProps {
  paths: ConnectorPath[];
}

function ConnectionLayer({ paths }: ConnectionLayerProps) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {paths.map((path) => (
        <path
          key={path.id}
          className="fill-none stroke-muted-foreground/80 stroke-[1.5] [stroke-dasharray:10_8] [stroke-linecap:round]"
          d={path.path}
        />
      ))}
    </svg>
  );
}

export default ConnectionLayer;
