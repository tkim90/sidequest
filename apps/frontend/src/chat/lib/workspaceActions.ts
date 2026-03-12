import type {
  AppState,
  ClosePrompt,
  MessageRecord,
  ReasoningEffort,
  WindowMap,
  WindowRecord,
} from "../../types";

function updateExistingWindow(
  state: AppState,
  windowId: string,
  updateWindow: (windowData: WindowRecord) => WindowRecord,
): AppState {
  const windowData = state.windows[windowId];
  if (!windowData) {
    return state;
  }

  const nextWindowData = updateWindow(windowData);
  if (nextWindowData === windowData) {
    return state;
  }

  return {
    ...state,
    windows: {
      ...state.windows,
      [windowId]: nextWindowData,
    },
  };
}

function updateWindowMessages(
  state: AppState,
  windowId: string,
  updateState: (
    windowData: WindowRecord,
    messages: MessageRecord[],
  ) => AppState,
): AppState {
  const windowData = state.windows[windowId];
  const messages = state.messagesByWindowId[windowId];
  if (!windowData || !messages) {
    return state;
  }

  return updateState(windowData, messages);
}

function updateAssistantMessage(
  messages: MessageRecord[],
  assistantMessageId: string,
  updateMessage: (message: MessageRecord) => MessageRecord,
): MessageRecord[] {
  return messages.map((message) =>
    message.id === assistantMessageId ? updateMessage(message) : message,
  );
}

function collectWindowTitles(
  windows: WindowMap,
  windowIds: string[],
): string[] {
  return windowIds
    .map((windowId) => windows[windowId]?.title)
    .filter((title): title is string => Boolean(title));
}

export function updateComposer(
  state: AppState,
  windowId: string,
  composer: string,
): AppState {
  return updateExistingWindow(state, windowId, (windowData) => ({
    ...windowData,
    composer,
  }));
}

export function updateWindowModel(
  state: AppState,
  windowId: string,
  selectedModel: string,
): AppState {
  return updateExistingWindow(state, windowId, (windowData) => {
    if (windowData.selectedModel === selectedModel) {
      return windowData;
    }

    return {
      ...windowData,
      selectedModel,
    };
  });
}

export function updateWindowEffort(
  state: AppState,
  windowId: string,
  selectedEffort: ReasoningEffort | null,
): AppState {
  return updateExistingWindow(state, windowId, (windowData) => {
    if (windowData.selectedEffort === selectedEffort) {
      return windowData;
    }

    return {
      ...windowData,
      selectedEffort,
    };
  });
}

export function setWindowHistoryExpanded(
  state: AppState,
  windowId: string,
  isHistoryExpanded: boolean,
): AppState {
  return updateExistingWindow(state, windowId, (windowData) => {
    if (windowData.isHistoryExpanded === isHistoryExpanded) {
      return windowData;
    }

    return {
      ...windowData,
      isHistoryExpanded,
    };
  });
}

export function queueOutgoingMessages(
  state: AppState,
  windowId: string,
  userMessage: MessageRecord,
  assistantMessage: MessageRecord,
): AppState {
  const windowData = state.windows[windowId];
  if (!windowData) {
    return state;
  }

  return {
    ...state,
    windows: {
      ...state.windows,
      [windowId]: {
        ...windowData,
        composer: "",
        isStreaming: true,
      },
    },
    messagesByWindowId: {
      ...state.messagesByWindowId,
      [windowId]: [
        ...(state.messagesByWindowId[windowId] || []),
        userMessage,
        assistantMessage,
      ],
    },
  };
}

export function appendAssistantDelta(
  state: AppState,
  windowId: string,
  assistantMessageId: string,
  delta: string,
): AppState {
  return updateWindowMessages(state, windowId, (windowData, messages) => ({
    ...state,
    windows: state.windows,
    messagesByWindowId: {
      ...state.messagesByWindowId,
      [windowId]: updateAssistantMessage(messages, assistantMessageId, (message) => ({
        ...message,
        content: `${message.content}${delta}`,
      })),
    },
  }));
}

export function appendAssistantReasoningDelta(
  state: AppState,
  windowId: string,
  assistantMessageId: string,
  delta: string,
  format: "raw" | "summary",
): AppState {
  return updateWindowMessages(state, windowId, (windowData, messages) => ({
    ...state,
    windows: state.windows,
    messagesByWindowId: {
      ...state.messagesByWindowId,
      [windowId]: updateAssistantMessage(messages, assistantMessageId, (message) => ({
        ...message,
        reasoningRawContent:
          format === "raw"
            ? `${message.reasoningRawContent}${delta}`
            : message.reasoningRawContent,
        reasoningSummaryContent:
          format === "summary"
            ? `${message.reasoningSummaryContent}${delta}`
            : message.reasoningSummaryContent,
      })),
    },
  }));
}

export function completeAssistantMessage(
  state: AppState,
  windowId: string,
  assistantMessageId: string,
): AppState {
  return updateWindowMessages(state, windowId, (windowData, messages) => ({
    ...state,
    windows: {
      ...state.windows,
      [windowId]: {
        ...windowData,
        isStreaming: false,
      },
    },
    messagesByWindowId: {
      ...state.messagesByWindowId,
      [windowId]: updateAssistantMessage(messages, assistantMessageId, (message) => ({
        ...message,
        status: "complete",
      })),
    },
  }));
}

export function failAssistantMessage(
  state: AppState,
  windowId: string,
  assistantMessageId: string,
  content: string,
): AppState {
  return updateWindowMessages(state, windowId, (windowData, messages) => ({
    ...state,
    windows: {
      ...state.windows,
      [windowId]: {
        ...windowData,
        isStreaming: false,
      },
    },
    messagesByWindowId: {
      ...state.messagesByWindowId,
      [windowId]: updateAssistantMessage(messages, assistantMessageId, (message) => ({
        ...message,
        content,
        status: "complete",
      })),
    },
  }));
}

export function retryAssistantMessage(
  state: AppState,
  windowId: string,
  oldMessageId: string,
  newMessage: MessageRecord,
): AppState {
  const windowData = state.windows[windowId];
  const messages = state.messagesByWindowId[windowId];
  if (!windowData || !messages) {
    return state;
  }

  const index = messages.findIndex((m) => m.id === oldMessageId);
  if (index === -1) {
    return state;
  }

  return {
    ...state,
    windows: {
      ...state.windows,
      [windowId]: {
        ...windowData,
        isStreaming: true,
      },
    },
    messagesByWindowId: {
      ...state.messagesByWindowId,
      [windowId]: [...messages.slice(0, index), newMessage],
    },
  };
}

export function removeWindowsFromState(
  state: AppState,
  windowIds: string[],
): AppState {
  const doomed = new Set(windowIds);

  const remainingWindows = Object.fromEntries(
    Object.entries(state.windows)
      .filter(([windowId]) => !doomed.has(windowId))
      .map(([windowId, windowData]) => [
        windowId,
        {
          ...windowData,
          childIds: windowData.childIds.filter((childId) => !doomed.has(childId)),
        },
      ]),
  );

  const remainingMessages = Object.fromEntries(
    Object.entries(state.messagesByWindowId).filter(
      ([windowId]) => !doomed.has(windowId),
    ),
  );

  const remainingAnchors = Object.fromEntries(
    Object.entries(state.anchors).filter(([, anchor]) => {
      return !doomed.has(anchor.parentWindowId) && !doomed.has(anchor.childWindowId);
    }),
  );

  return {
    ...state,
    windows: remainingWindows,
    zOrder: state.zOrder.filter((windowId) => !doomed.has(windowId)),
    messagesByWindowId: remainingMessages,
    anchors: remainingAnchors,
  };
}

export function addRootWindow(
  state: AppState,
  rootWindow: WindowRecord,
): AppState {
  return {
    ...state,
    windows: {
      ...state.windows,
      [rootWindow.id]: rootWindow,
    },
    zOrder: [...state.zOrder, rootWindow.id],
    messagesByWindowId: {
      ...state.messagesByWindowId,
      [rootWindow.id]: [],
    },
  };
}

export function buildCloseBranchPrompt(
  windows: WindowMap,
  windowId: string,
  descendantIds: string[],
): ClosePrompt | null {
  if (descendantIds.length === 0) {
    return null;
  }

  return {
    confirmLabel: "Close all",
    eyebrow: "Close branch tree",
    title: "Closing this window will also close its connected windows.",
    windowIds: [windowId, ...descendantIds],
    windowTitles: collectWindowTitles(windows, descendantIds),
  };
}

export function buildCloseAllChildrenPrompt(
  windows: WindowMap,
): ClosePrompt | null {
  const childWindowIds = Object.values(windows)
    .filter((windowData) => windowData.parentId !== null)
    .map((windowData) => windowData.id);

  if (childWindowIds.length === 0) {
    return null;
  }

  return {
    confirmLabel: "Close child windows",
    eyebrow: "Close child windows",
    title: "This will close every branched chat window and keep the main thread open.",
    windowIds: childWindowIds,
    windowTitles: collectWindowTitles(windows, childWindowIds),
  };
}
