import type {
  TLAsset,
  TLBindingCreate,
} from "tldraw";

export type ChatRole = "user" | "assistant";
export type MessageStatus = "complete" | "streaming";
export type WindowKind = "chat" | "visualization";
export type VisualizationStatus = "loading" | "ready" | "error";
export type VisualizationPhase = "planning";
export type ReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export interface ChatModelOption {
  id: string;
  efforts: ReasoningEffort[];
  defaultEffort: ReasoningEffort | null;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface BranchFocus {
  selectedText: string;
  parentWindowTitle: string;
  parentMessageRole: ChatRole;
  latestUserQuery?: string;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
  zoom: number;
}

export interface VisualizationPreviewShape {
  _type: string;
  shapeId: string;
  anchor?: string;
  bend?: number;
  color?: string;
  dash?: string;
  fill?: string;
  font?: string;
  fontSize?: number;
  fromId?: string;
  h?: number;
  maxWidth?: number;
  name?: string;
  note?: string;
  size?: string;
  subType?: string;
  text?: string;
  textAlign?: "start" | "middle" | "end";
  toId?: string;
  w?: number;
  x?: number;
  x1?: number;
  x2?: number;
  y?: number;
  y1?: number;
  y2?: number;
}

export interface VisualizationRecord {
  status: VisualizationStatus;
  phase: VisualizationPhase | null;
  title: string;
  prompt: string;
  shapes: VisualizationPreviewShape[];
  assets: TLAsset[];
  bindings: TLBindingCreate[];
  errorMessage: string | null;
}

export interface WindowRecord {
  id: string;
  kind: WindowKind;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId: string | null;
  childIds: string[];
  branchAnchorId: string | null;
  branchFocus: BranchFocus | null;
  inheritedMessageCount: number;
  isHistoryExpanded: boolean;
  composer: string;
  selectedModel: string | null;
  selectedEffort: ReasoningEffort | null;
  isStreaming: boolean;
}

export interface MessageRecord {
  id: string;
  role: ChatRole;
  content: string;
  status: MessageStatus;
  model?: string;
  reasoningRawContent: string;
  reasoningSummaryContent: string;
}

export interface AnchorRecord {
  id: string;
  groupKey: string;
  parentWindowId: string;
  parentMessageId: string;
  childWindowId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
}

export interface AnchorGroup {
  key: string;
  startOffset: number;
  endOffset: number;
  anchorIds: string[];
  preview?: boolean;
  activeSource?: boolean;
}

export type WindowMap = Record<string, WindowRecord>;
export type MessagesByWindowId = Record<string, MessageRecord[]>;
export type AnchorMap = Record<string, AnchorRecord>;
export type AnchorGroupsByMessageKey = Record<string, AnchorGroup[]>;
export type VisualizationsByWindowId = Record<string, VisualizationRecord>;

export interface AppState {
  viewport: Viewport;
  windows: WindowMap;
  zOrder: string[];
  messagesByWindowId: MessagesByWindowId;
  visualizationsByWindowId: VisualizationsByWindowId;
  anchors: AnchorMap;
}

export type AnchorOverlapResult =
  | {
      type: "exact";
      groupKey: string;
    }
  | {
      type: "partial";
    }
  | {
      type: "clear";
      groupKey: string;
    };
