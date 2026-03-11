import type {
  AppState,
  AnchorRecord,
  BranchFocus,
  ChatMessage,
  ChatRole,
  MessageRecord,
  MessageStatus,
  MessagesByWindowId,
  ReasoningEffort,
  WindowMap,
  WindowRecord,
} from "../../types";
import {
  ROOT_WINDOW_TITLE,
  ROOT_WINDOW_X,
  ROOT_WINDOW_Y,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
} from "./constants";

interface CreateWindowRecordOptions {
  title: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  parentId?: string | null;
  branchAnchorId?: string | null;
  branchFocus?: BranchFocus | null;
  inheritedMessageCount?: number;
  isHistoryExpanded?: boolean;
  selectedModel?: string | null;
  selectedEffort?: ReasoningEffort | null;
}

interface CreateAnchorGroupKeyOptions {
  parentWindowId: string;
  parentMessageId: string;
  startOffset: number;
  endOffset: number;
}

interface CreateAnchorRecordOptions extends CreateAnchorGroupKeyOptions {
  childWindowId: string;
  selectedText: string;
}

export function createWindowRecord({
  title,
  x,
  y,
  width = WINDOW_WIDTH,
  height = WINDOW_HEIGHT,
  parentId = null,
  branchAnchorId = null,
  branchFocus = null,
  inheritedMessageCount = 0,
  isHistoryExpanded = true,
  selectedModel = null,
  selectedEffort = null,
}: CreateWindowRecordOptions): WindowRecord {
  return {
    id: crypto.randomUUID(),
    title,
    x,
    y,
    width,
    height,
    parentId,
    childIds: [],
    branchAnchorId,
    branchFocus,
    inheritedMessageCount,
    isHistoryExpanded,
    composer: "",
    selectedModel,
    selectedEffort,
    isStreaming: false,
  };
}

export function createInitialState(rootWindowX: number = ROOT_WINDOW_X): AppState {
  const rootWindow = createWindowRecord({
    title: ROOT_WINDOW_TITLE,
    x: rootWindowX,
    y: ROOT_WINDOW_Y,
  });

  return {
    viewport: {
      x: 0,
      y: 0,
      scale: 1,
      zoom: 1,
    },
    windows: {
      [rootWindow.id]: rootWindow,
    },
    zOrder: [rootWindow.id],
    messagesByWindowId: {
      [rootWindow.id]: [],
    },
    anchors: {},
  };
}

export function createMessage(
  role: ChatRole,
  content: string,
  status: MessageStatus = "complete",
  model?: string,
): MessageRecord {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    status,
    model,
    reasoningRawContent: "",
    reasoningSummaryContent: "",
  };
}

export function cloneMessagesForBranch(messages: MessageRecord[]): MessageRecord[] {
  return messages.map((message) => ({
    ...message,
    id: crypto.randomUUID(),
    status: "complete",
  }));
}

export function createAnchorGroupKey({
  parentWindowId,
  parentMessageId,
  startOffset,
  endOffset,
}: CreateAnchorGroupKeyOptions): string {
  return `${parentWindowId}:${parentMessageId}:${startOffset}:${endOffset}`;
}

export function createAnchorRecord({
  parentWindowId,
  parentMessageId,
  childWindowId,
  selectedText,
  startOffset,
  endOffset,
}: CreateAnchorRecordOptions): AnchorRecord {
  return {
    id: crypto.randomUUID(),
    groupKey: createAnchorGroupKey({
      parentWindowId,
      parentMessageId,
      startOffset,
      endOffset,
    }),
    parentWindowId,
    parentMessageId,
    childWindowId,
    selectedText,
    startOffset,
    endOffset,
  };
}

export function getDescendantIds(windows: WindowMap, rootId: string): string[] {
  const descendants: string[] = [];
  const stack = [...(windows[rootId]?.childIds || [])];

  while (stack.length > 0) {
    const windowId = stack.pop();
    if (!windowId) {
      continue;
    }

    descendants.push(windowId);
    stack.push(...(windows[windowId]?.childIds || []));
  }

  return descendants;
}

export function getNextRootChatTitle(windows: WindowMap): string {
  let max = 0;
  for (const w of Object.values(windows)) {
    if (w.parentId !== null) continue;
    const match = w.title.match(/^Chat (\d+)$/);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `Chat ${max + 1}`;
}

export function getCanvasMessages(
  windowMessages: MessagesByWindowId,
  windowId: string,
): ChatMessage[] {
  const messages = windowMessages[windowId] || [];
  return messages
    .filter((message) => message.status !== "streaming")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}
