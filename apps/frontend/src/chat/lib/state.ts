import type {
  AppState,
  AnchorRecord,
  BranchFocus,
  ChatMessage,
  ChatRole,
  MessageRecord,
  MessageStatus,
  MessagesByWindowId,
  WindowMap,
  WindowRecord,
} from "../../types";
import {
  ROOT_WINDOW_TITLE,
  ROOT_WINDOW_X,
  ROOT_WINDOW_Y,
} from "./constants";

interface CreateWindowRecordOptions {
  title: string;
  x: number;
  y: number;
  parentId?: string | null;
  branchAnchorId?: string | null;
  branchFocus?: BranchFocus | null;
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
  parentId = null,
  branchAnchorId = null,
  branchFocus = null,
}: CreateWindowRecordOptions): WindowRecord {
  return {
    id: crypto.randomUUID(),
    title,
    x,
    y,
    parentId,
    childIds: [],
    branchAnchorId,
    branchFocus,
    composer: "",
    isStreaming: false,
  };
}

export function createInitialState(): AppState {
  const rootWindow = createWindowRecord({
    title: ROOT_WINDOW_TITLE,
    x: ROOT_WINDOW_X,
    y: ROOT_WINDOW_Y,
  });

  return {
    viewport: {
      x: 0,
      y: 0,
      scale: 1,
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
): MessageRecord {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    status,
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
