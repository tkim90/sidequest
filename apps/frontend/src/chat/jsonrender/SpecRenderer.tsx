import {
  Component,
  memo,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
  useState,
} from "react";

import { surfaceClass } from "./theme";
import type { JsonRenderElement, JsonRenderSpec } from "./types";

type SpecRegistry = Record<string, ComponentType<Record<string, unknown>>>;

class ElementErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[SpecRenderer] element render failed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={`${surfaceClass} border-dashed bg-muted p-2 text-xs text-muted-foreground`}>
          Component failed to render
        </div>
      );
    }
    return this.props.children;
  }
}

interface SpecRendererProps {
  spec: JsonRenderSpec;
  registry: SpecRegistry;
  partial?: boolean;
  rawJson?: string;
}

interface SpecElementNodeProps {
  element: JsonRenderElement;
  elementId: string;
  elements: JsonRenderSpec["elements"];
  registry: SpecRegistry;
}

function SpecElementNodeImpl({
  element,
  elementId,
  elements,
  registry,
}: SpecElementNodeProps) {
  const RegisteredComponent = registry[element.type];

  if (!RegisteredComponent) {
    return (
      <div className={`${surfaceClass} border-dashed bg-muted p-2 text-xs text-muted-foreground`}>
        Unknown component: {element.type} ({elementId})
      </div>
    );
  }

  const childIds = element.children ?? [];
  const children =
    childIds.length > 0
      ? childIds.map((childId) => {
          const childElement = elements[childId];
          if (!childElement) {
            return null;
          }

          return (
            <SpecElementNode
              key={childId}
              element={childElement}
              elementId={childId}
              elements={elements}
              registry={registry}
            />
          );
        })
      : null;

  const props = (element.props ?? {}) as Record<string, unknown>;

  return (
    <ElementErrorBoundary>
      {children ? (
        <RegisteredComponent {...props}>{children}</RegisteredComponent>
      ) : (
        <RegisteredComponent {...props} />
      )}
    </ElementErrorBoundary>
  );
}

const SpecElementNode = memo(
  SpecElementNodeImpl,
  (previous, next) =>
    previous.element === next.element && previous.registry === next.registry,
);

interface SpecTreeProps {
  rootId: string;
  elements: JsonRenderSpec["elements"];
  registry: SpecRegistry;
}

const SpecTree = memo(
  function SpecTree({ rootId, elements, registry }: SpecTreeProps) {
    const rootElement = elements[rootId];
    if (!rootElement) {
      return null;
    }

    return (
      <SpecElementNode
        element={rootElement}
        elementId={rootId}
        elements={elements}
        registry={registry}
      />
    );
  },
  (previous, next) => {
    if (previous.rootId !== next.rootId || previous.registry !== next.registry) {
      return false;
    }

    return previous.elements[previous.rootId] === next.elements[next.rootId];
  },
);

function SpecMetadata({ rawJson }: { rawJson: string }) {
  const [showMetadata, setShowMetadata] = useState(false);

  return (
    <div className="mt-2 flex flex-col items-end">
      <button
        type="button"
        className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        onClick={() => setShowMetadata((value) => !value)}
      >
        {showMetadata ? "Hide Metadata" : "See Metadata"}
      </button>
      {showMetadata && (
        <pre className="mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover p-3 font-mono text-xs text-popover-foreground shadow-sm">
          {rawJson}
        </pre>
      )}
    </div>
  );
}

export default function SpecRenderer({
  spec,
  registry,
  partial,
  rawJson,
}: SpecRendererProps) {
  const rootElement = spec.elements[spec.root];
  if (!spec.root || !rootElement) {
    return null;
  }

  return (
    <div
      className={`my-3 ${partial ? "border-l-2 border-primary pl-3" : ""}`}
      data-no-branch
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <SpecTree rootId={spec.root} elements={spec.elements} registry={registry} />
      {rawJson ? <SpecMetadata rawJson={rawJson} /> : null}
    </div>
  );
}

export function SpecRendererSkeleton() {
  return (
    <div className="my-3 animate-pulse rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="mt-3 h-20 rounded-lg border border-border bg-secondary" />
    </div>
  );
}
