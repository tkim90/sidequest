import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import { useDeltaBatcher } from "./useDeltaBatcher";

import type {
  AppState,
  ChatMessage,
  ClosePrompt,
  MessagesByWindowId,
  SelectionState,
  WindowScrollState,
  WindowRecord,
} from "../../types";
import { fetchChatModelConfig, streamChat } from "../api/streamChat";
import {
  ROOT_WINDOW_X,
  ROOT_WINDOW_Y,
  WINDOW_WIDTH,
} from "../lib/constants";
import { getErrorMessage, isAbortError } from "../lib/errors";
import {
  createMessage,
  createWindowRecord,
  getCanvasMessages,
  getNextRootChatTitle,
  createInitialState,
  getDescendantIds,
} from "../lib/state";
import {
  addRootWindow,
  buildCloseAllChildrenPrompt,
  buildCloseBranchPrompt,
  completeAssistantMessage,
  failAssistantMessage,
  retryAssistantMessage,
  queueOutgoingMessages,
  removeWindowsFromState,
  setWindowHistoryExpanded,
  updateComposer,
  updateWindowModel,
} from "../lib/workspaceActions";
import { useBranchSelection } from "./useBranchSelection";
import { useCanvasInteractions } from "./useCanvasInteractions";

export interface ChatWorkspaceViewModel {
  availableModels: string[];
  anchorGroupsByMessageKey: ReturnType<
    typeof useCanvasInteractions
  >["anchorGroupsByMessageKey"];
  canvasRef: RefObject<HTMLDivElement | null>;
  closePrompt: ClosePrompt | null;
  connectorPaths: ReturnType<typeof useCanvasInteractions>["connectorPaths"];
  hasChildWindows: boolean;
  messagesByWindowId: MessagesByWindowId;
  notice: string;
  onCanvasPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onCloseAllChildWindows: () => void;
  onClosePromptCancel: () => void;
  onClosePromptConfirm: () => void;
  onComposerChange: (windowId: string, composer: string) => void;
  onModelChange: (windowId: string, model: string) => void;
  onGeometryChange: () => void;
  onHeaderPointerDown: ReturnType<
    typeof useCanvasInteractions
  >["onHeaderPointerDown"];
  onResizePointerDown: ReturnType<
    typeof useCanvasInteractions
  >["onResizePointerDown"];
  onMessageMouseDown: ReturnType<
    typeof useBranchSelection
  >["onMessageMouseDown"];
  onOpenFreshRootWindow: () => void;
  onRetry: (windowId: string, messageId: string) => Promise<void>;
  onSelectionBranch: () => void;
  onSend: (windowId: string, promptOverride?: string) => Promise<void>;
  onToggleHistoryExpanded: (windowId: string) => void;
  onWindowClose: (windowId: string) => void;
  onWindowFocus: (windowId: string) => void;
  onWindowScrollStateChange: (
    windowId: string,
    nextState: WindowScrollState,
  ) => void;
  popoverRef: RefObject<HTMLDivElement | null>;
  registerAnchorRef: ReturnType<
    typeof useCanvasInteractions
  >["registerAnchorRef"];
  registerWindowRef: ReturnType<
    typeof useCanvasInteractions
  >["registerWindowRef"];
  selectionState: SelectionState | null;
  viewport: AppState["viewport"];
  windowScrollStates: Record<string, WindowScrollState>;
  windows: WindowRecord[];
}

function getViewportCenteredRootX(windowWidth: number): number {
  if (typeof window === "undefined") {
    return ROOT_WINDOW_X;
  }

  return Math.max(24, Math.round((window.innerWidth - windowWidth) / 2));
}

export function useChatWorkspace(): ChatWorkspaceViewModel {
  const [appState, setAppState] = useState<AppState>(() =>
    createInitialState(getViewportCenteredRootX(WINDOW_WIDTH)),
  );
  const [closePrompt, setClosePrompt] = useState<ClosePrompt | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const appStateRef = useRef(appState);
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const windowScrollStatesRef = useRef<Record<string, WindowScrollState>>({});

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 2800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const config = await fetchChatModelConfig(controller.signal);
        const fallbackModel = config.defaultModel ?? config.models[0] ?? null;

        setAvailableModels(config.models);
        setDefaultModel(fallbackModel);

        if (!fallbackModel) {
          return;
        }

        setAppState((current) => {
          let changed = false;
          const nextWindows = Object.fromEntries(
            Object.entries(current.windows).map(([windowId, windowData]) => {
              if (windowData.selectedModel) {
                return [windowId, windowData];
              }

              changed = true;
              return [
                windowId,
                {
                  ...windowData,
                  selectedModel: fallbackModel,
                },
              ];
            }),
          );

          if (!changed) {
            return current;
          }

          return {
            ...current,
            windows: nextWindows,
          };
        });
      } catch (error: unknown) {
        if (!isAbortError(error)) {
          setNotice(getErrorMessage(error));
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, []);

  const canvas = useCanvasInteractions({
    appState,
    appStateRef,
    setAppState,
  });

  const selection = useBranchSelection({
    appStateRef,
    requestGeometryRefresh: canvas.requestGeometryRefresh,
    setAppState,
    setNotice,
    windowRefs: canvas.windowRefs,
  });

  const deltaBatcher = useDeltaBatcher(setAppState, canvas.requestGeometryRefresh);

  function getCenteredRootX(windowWidth: number): number {
    const canvasWidth = canvas.canvasRef.current?.clientWidth;
    if (!canvasWidth) {
      return getViewportCenteredRootX(windowWidth);
    }

    return Math.max(24, Math.round((canvasWidth - windowWidth) / 2));
  }

  function handleComposerChange(windowId: string, composer: string): void {
    setAppState((current) => updateComposer(current, windowId, composer));
  }

  function handleModelChange(windowId: string, model: string): void {
    setAppState((current) => updateWindowModel(current, windowId, model));
  }

  const handleWindowScrollStateChange = useCallback((
    windowId: string,
    nextState: WindowScrollState,
  ): void => {
    const currentState = windowScrollStatesRef.current[windowId];
    if (
      currentState &&
      currentState.scrollTop === nextState.scrollTop &&
      currentState.shouldAutoScroll === nextState.shouldAutoScroll
    ) {
      return;
    }

    windowScrollStatesRef.current[windowId] = nextState;
  }, []);

  async function handleSend(
    windowId: string,
    promptOverride?: string,
  ): Promise<void> {
    const snapshot = appStateRef.current;
    const windowData = snapshot.windows[windowId];
    if (!windowData) {
      return;
    }

    const composer = (promptOverride ?? windowData.composer).trim();
    if (!composer || windowData.isStreaming) {
      return;
    }

    canvas.onWindowFocus(windowId);
    selection.dismissSelection();

    const userMessage = createMessage("user", composer);
    const resolvedModel =
      windowData.selectedModel ?? defaultModel ?? availableModels[0] ?? undefined;
    const assistantMessage = createMessage(
      "assistant",
      "",
      "streaming",
      resolvedModel,
    );
    const requestMessages: ChatMessage[] = [
      ...getCanvasMessages(snapshot.messagesByWindowId, windowId),
      { role: "user", content: composer },
    ];

    setAppState((current) =>
      queueOutgoingMessages(current, windowId, userMessage, assistantMessage),
    );

    const controller = new AbortController();
    abortControllersRef.current[windowId] = controller;

    try {
      const batcher = deltaBatcher.start(windowId, assistantMessage.id);

      await streamChat({
        messages: requestMessages,
        branchFocus: windowData.branchFocus,
        model: resolvedModel,
        signal: controller.signal,
        onDelta: batcher.push,
      });

      batcher.flush();

      setAppState((current) =>
        completeAssistantMessage(current, windowId, assistantMessage.id),
      );
    } catch (error: unknown) {
      const aborted = isAbortError(error);
      const message = getErrorMessage(error);

      if (!aborted) {
        setNotice(message);
      }

      deltaBatcher.cancel(windowId);

      setAppState((current) =>
        failAssistantMessage(
          current,
          windowId,
          assistantMessage.id,
          aborted
            ? "Streaming stopped."
            : `Sorry, something went wrong: ${message}`,
        ),
      );
    } finally {
      delete abortControllersRef.current[windowId];
      canvas.requestGeometryRefresh();
    }
  }

  async function handleRetry(windowId: string, messageId: string): Promise<void> {
    const snapshot = appStateRef.current;
    const windowData = snapshot.windows[windowId];
    const messages = snapshot.messagesByWindowId[windowId];
    if (!windowData || !messages || windowData.isStreaming) {
      return;
    }

    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].role !== "assistant") {
      return;
    }

    canvas.onWindowFocus(windowId);
    selection.dismissSelection();

    const resolvedModel =
      windowData.selectedModel ?? defaultModel ?? availableModels[0] ?? undefined;
    const assistantMessage = createMessage("assistant", "", "streaming", resolvedModel);

    const requestMessages: ChatMessage[] = messages
      .slice(0, messageIndex)
      .filter((m) => m.status !== "streaming")
      .map((m) => ({ role: m.role, content: m.content }));

    setAppState((current) =>
      retryAssistantMessage(current, windowId, messageId, assistantMessage),
    );

    const controller = new AbortController();
    abortControllersRef.current[windowId] = controller;

    try {
      const batcher = deltaBatcher.start(windowId, assistantMessage.id);

      await streamChat({
        messages: requestMessages,
        branchFocus: windowData.branchFocus,
        model: resolvedModel,
        signal: controller.signal,
        onDelta: batcher.push,
      });

      batcher.flush();

      setAppState((current) =>
        completeAssistantMessage(current, windowId, assistantMessage.id),
      );
    } catch (error: unknown) {
      const aborted = isAbortError(error);
      const message = getErrorMessage(error);

      if (!aborted) {
        setNotice(message);
      }

      deltaBatcher.cancel(windowId);

      setAppState((current) =>
        failAssistantMessage(
          current,
          windowId,
          assistantMessage.id,
          aborted
            ? "Streaming stopped."
            : `Sorry, something went wrong: ${message}`,
        ),
      );
    } finally {
      delete abortControllersRef.current[windowId];
      canvas.requestGeometryRefresh();
    }
  }

  function removeWindows(windowIds: string[]): void {
    windowIds.forEach((windowId) => {
      abortControllersRef.current[windowId]?.abort();
      delete abortControllersRef.current[windowId];
      delete canvas.windowRefs.current[windowId];
      delete windowScrollStatesRef.current[windowId];
    });

    setAppState((current) => removeWindowsFromState(current, windowIds));

    selection.dismissSelection();
    setClosePrompt(null);
    canvas.requestGeometryRefresh();
  }

  function handleClose(windowId: string): void {
    const snapshot = appStateRef.current;
    const descendants = getDescendantIds(snapshot.windows, windowId);
    const prompt = buildCloseBranchPrompt(snapshot.windows, windowId, descendants);

    if (!prompt) {
      removeWindows([windowId]);
      return;
    }

    setClosePrompt(prompt);
  }

  function handleCloseAllChildWindows(): void {
    setClosePrompt(buildCloseAllChildrenPrompt(appStateRef.current.windows));
  }

  function dismissClosePrompt(): void {
    setClosePrompt(null);
  }

  function confirmClosePrompt(): void {
    if (!closePrompt) {
      return;
    }

    removeWindows(closePrompt.windowIds);
  }

  function openFreshRootWindow(): void {
    setAppState((current) => {
      const title = getNextRootChatTitle(current.windows);
      const rootWindow = createWindowRecord({
        title,
        x: getCenteredRootX(WINDOW_WIDTH),
        y: ROOT_WINDOW_Y,
        selectedModel: defaultModel ?? availableModels[0] ?? null,
      });
      return addRootWindow(current, rootWindow);
    });
  }

  function handleToggleHistoryExpanded(windowId: string): void {
    setAppState((current) => {
      const windowData = current.windows[windowId];
      if (!windowData || windowData.inheritedMessageCount === 0) {
        return current;
      }

      return setWindowHistoryExpanded(
        current,
        windowId,
        !windowData.isHistoryExpanded,
      );
    });
    canvas.requestGeometryRefresh();
  }

  const windows = appState.zOrder
    .map((windowId) => appState.windows[windowId])
    .filter((windowData): windowData is WindowRecord => Boolean(windowData));
  const hasChildWindows = windows.some((windowData) => windowData.parentId !== null);

  return {
    availableModels,
    anchorGroupsByMessageKey: canvas.anchorGroupsByMessageKey,
    canvasRef: canvas.canvasRef,
    closePrompt,
    connectorPaths: canvas.connectorPaths,
    hasChildWindows,
    messagesByWindowId: appState.messagesByWindowId,
    notice,
    onCanvasPointerDown: (event) => {
      selection.dismissSelection();
      canvas.onCanvasPointerDown(event);
    },
    onCloseAllChildWindows: handleCloseAllChildWindows,
    onClosePromptCancel: dismissClosePrompt,
    onClosePromptConfirm: confirmClosePrompt,
    onComposerChange: handleComposerChange,
    onModelChange: handleModelChange,
    onGeometryChange: canvas.requestGeometryRefresh,
    onHeaderPointerDown: (event, windowId) => {
      selection.dismissSelection();
      canvas.onHeaderPointerDown(event, windowId);
    },
    onResizePointerDown: (event, windowId, edges) => {
      selection.dismissSelection();
      canvas.onResizePointerDown(event, windowId, edges);
    },
    onMessageMouseDown: selection.onMessageMouseDown,
    onOpenFreshRootWindow: openFreshRootWindow,
    onRetry: handleRetry,
    onSelectionBranch: selection.onSelectionBranch,
    onSend: handleSend,
    onToggleHistoryExpanded: handleToggleHistoryExpanded,
    onWindowClose: handleClose,
    onWindowFocus: canvas.onWindowFocus,
    onWindowScrollStateChange: handleWindowScrollStateChange,
    popoverRef: selection.popoverRef,
    registerAnchorRef: canvas.registerAnchorRef,
    registerWindowRef: canvas.registerWindowRef,
    selectionState: selection.selectionState,
    viewport: appState.viewport,
    windowScrollStates: windowScrollStatesRef.current,
    windows,
  };
}
