import type { ConnectorPath } from "../../types";

interface ConnectionLayerProps {
  paths: ConnectorPath[];
}

function ConnectionLayer({ paths }: ConnectionLayerProps) {
  return (
    <svg className="connection-layer" aria-hidden="true">
      {paths.map((path) => (
        <path key={path.id} d={path.path} />
      ))}
    </svg>
  );
}

export default ConnectionLayer;
