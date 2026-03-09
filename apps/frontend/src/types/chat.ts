export type ChatRole = "user" | "assistant";
export type MessageStatus = "complete" | "streaming";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface BranchFocus {
  selectedText: string;
  parentWindowTitle: string;
  parentMessageRole: ChatRole;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface WindowRecord {
  id: string;
  title: string;
  x: number;
  y: number;
  parentId: string | null;
  childIds: string[];
  branchAnchorId: string | null;
  branchFocus: BranchFocus | null;
  composer: string;
  isStreaming: boolean;
}

export interface MessageRecord {
  id: string;
  role: ChatRole;
  content: string;
  status: MessageStatus;
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
}

export type WindowMap = Record<string, WindowRecord>;
export type MessagesByWindowId = Record<string, MessageRecord[]>;
export type AnchorMap = Record<string, AnchorRecord>;
export type AnchorGroupsByMessageKey = Record<string, AnchorGroup[]>;

export interface AppState {
  viewport: Viewport;
  windows: WindowMap;
  zOrder: string[];
  messagesByWindowId: MessagesByWindowId;
  anchors: AnchorMap;
}

type TextSegment = {
  type: "text";
  text: string;
};

type AnchorSegment = {
  type: "anchor";
  key: string;
  text: string;
  count: number;
};

export type MessageContentSegment = TextSegment | AnchorSegment;

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
