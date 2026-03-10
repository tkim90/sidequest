export interface JsonRenderElement {
  type: string;
  props?: Record<string, unknown>;
  children?: string[];
  [key: string]: unknown;
}

export interface JsonRenderSpec {
  root: string;
  elements: Record<string, JsonRenderElement>;
}
