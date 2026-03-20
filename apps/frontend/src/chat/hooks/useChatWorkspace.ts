import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import { useDeltaBatcher } from "./useDeltaBatcher";

import type {
  AnchorGroup,
  AnchorGroupsByMessageKey,
  AppState,
  ChatMessage,
  ClosePrompt,
  MessagesByWindowId,
  ReasoningEffort,
  SelectionState,
  WindowScrollState,
  WindowRecord,
} from "../../types";
import { streamChat } from "../api/streamChat";
import { useNoticeStore } from "../../stores/noticeStore";
import { useModelStore } from "../../stores/modelStore";
import {
  FLOATING_ROOT_WINDOW_HEIGHT,
  FLOATING_ROOT_WINDOW_WIDTH,
  LEFT_PANE_WIDTH_STORAGE_KEY,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  ROOT_WINDOW_X,
  ROOT_WINDOW_Y,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
} from "../lib/constants";
import { getErrorMessage, isAbortError } from "../lib/errors";
import { resolveEffortForModel, resolveModelOption } from "../lib/modelOptions";
import {
  getNextOverlappingPanePlacement,
  resolveFloatingPaneSize,
} from "../lib/panePlacement";
import {
  createMessage,
  createWindowRecord,
  getCanvasMessages,
  getNextRootChatTitle,
  createInitialState,
  getDescendantIds,
} from "../lib/state";
import { clampLeftPaneWidth, resolveStoredLeftPaneWidth } from "../lib/paneLayout";
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
  updateWindowEffort,
} from "../lib/workspaceActions";
import { useBranchSelection } from "./useBranchSelection";
import { useCanvasInteractions } from "./useCanvasInteractions";

export interface ChatWorkspaceViewModel {
  anchorGroupsByMessageKey: ReturnType<
    typeof useCanvasInteractions
  >["anchorGroupsByMessageKey"];
  canvasRef: RefObject<HTMLDivElement | null>;
  closePrompt: ClosePrompt | null;
  connectorPaths: ReturnType<typeof useCanvasInteractions>["connectorPaths"];
  hasChildWindows: boolean;
  isPaneResizing: boolean;
  leftPaneWidthPx: number | null;
  messagesByWindowId: MessagesByWindowId;
  onCanvasPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onCloseAllChildWindows: () => void;
  onClosePromptCancel: () => void;
  onClosePromptConfirm: () => void;
  onComposerChange: (windowId: string, composer: string) => void;
  onModelChange: (windowId: string, model: string) => void;
  onEffortChange: (windowId: string, effort: ReasoningEffort | null) => void;
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
  onNavigateToBranchSource: (
    windowId: string,
    branchAnchorId: string | null,
  ) => void;
  onOpenFreshRootWindow: () => void;
  onPaneResizePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onRetry: (windowId: string, messageId: string) => Promise<void>;
  onSelectionExpand: () => void;
  onSelectionBranch: (prompt?: string) => void;
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
  splitPaneRef: RefObject<HTMLDivElement | null>;
  viewport: AppState["viewport"];
  windowScrollStates: Record<string, WindowScrollState>;
  windows: WindowRecord[];
  mainWindow: WindowRecord | null;
}

export function mergeSelectionPreviewAnchorGroup(
  base: AnchorGroupsByMessageKey,
  selectionState: SelectionState | null,
): AnchorGroupsByMessageKey {
  if (
    !selectionState ||
    selectionState.stage !== "compose" ||
    selectionState.startOffset === undefined ||
    selectionState.endOffset === undefined
  ) {
    return base;
  }

  const messageKey = `${selectionState.parentWindowId}:${selectionState.parentMessageId}`;
  const previewGroup: AnchorGroup = {
    key: `__preview__`,
    startOffset: selectionState.startOffset,
    endOffset: selectionState.endOffset,
    anchorIds: [],
    preview: true,
  };

  const existing = base[messageKey] ?? [];
  const groupsWithPreview = [...existing, previewGroup].sort((left, right) => {
    if (left.startOffset !== right.startOffset) {
      return left.startOffset - right.startOffset;
    }

    return left.endOffset - right.endOffset;
  });

  return {
    ...base,
    [messageKey]: groupsWithPreview,
  };
}

interface BranchSourceNavigation {
  shouldBringSourceToFront: boolean;
  shouldExpandSourceHistory: boolean;
  sourceGroupKey: string;
  sourceWindowId: string;
}

export function resolveBranchSourceNavigation(
  appState: AppState,
  windowId: string,
  branchAnchorId: string | null,
): BranchSourceNavigation | null {
  if (!branchAnchorId) {
    return null;
  }

  const childWindow = appState.windows[windowId];
  if (!childWindow?.parentId) {
    return null;
  }

  if (!appState.windows[childWindow.parentId]) {
    return null;
  }

  const anchor = appState.anchors[branchAnchorId];
  if (!anchor || anchor.childWindowId !== windowId) {
    return null;
  }

  const sourceWindow = appState.windows[anchor.parentWindowId];
  if (!sourceWindow) {
    return null;
  }

  const sourceMessages = appState.messagesByWindowId[sourceWindow.id] ?? [];
  const sourceMessageIndex = sourceMessages.findIndex(
    (message) => message.id === anchor.parentMessageId,
  );
  if (sourceMessageIndex < 0) {
    return null;
  }

  const shouldExpandSourceHistory =
    sourceWindow.inheritedMessageCount > 0 &&
    !sourceWindow.isHistoryExpanded &&
    sourceMessageIndex < sourceWindow.inheritedMessageCount;

  return {
    shouldBringSourceToFront: sourceWindow.parentId !== null,
    shouldExpandSourceHistory,
    sourceGroupKey: anchor.groupKey,
    sourceWindowId: sourceWindow.id,
  };
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
  const [leftPaneWidthPx, setLeftPaneWidthPx] = useState<number | null>(null);
  const [isPaneResizing, setIsPaneResizing] = useState(false);
  const appStateRef = useRef(appState);
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const windowScrollStatesRef = useRef<Record<string, WindowScrollState>>({});
  const pendingBranchSendRef = useRef<{ windowId: string; prompt: string } | null>(null);
  const splitPaneRef = useRef<HTMLDivElement | null>(null);
  const leftPaneWidthRef = useRef<number | null>(null);
  const paneResizeRef = useRef<{
    containerWidth: number;
    startClientX: number;
    startLeftPaneWidth: number;
  } | null>(null);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    leftPaneWidthRef.current = leftPaneWidthPx;
  }, [leftPaneWidthPx]);

  const persistLeftPaneWidth = useCallback((width: number) => {
    try {
      window.localStorage.setItem(LEFT_PANE_WIDTH_STORAGE_KEY, String(width));
    } catch {
      // Ignore storage failures and keep the in-memory width.
    }
  }, []);

  useEffect(() => {
    const pending = pendingBranchSendRef.current;
    if (!pending) return;

    const windowData = appState.windows[pending.windowId];
    if (!windowData) {
      pendingBranchSendRef.current = null;
      return;
    }

    pendingBranchSendRef.current = null;
    void handleSend(pending.windowId, pending.prompt);
  }, [appState]);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      await useModelStore.getState().fetchModels(controller.signal);

      const { defaultModel: fallbackModel, models, modelsById } = useModelStore.getState();
      if (!fallbackModel && models.length === 0) {
        return;
      }

      setAppState((current) => {
        let changed = false;
        const nextWindows = Object.fromEntries(
          Object.entries(current.windows).map(([windowId, windowData]) => {
            const modelOption = resolveModelOption(
              modelsById,
              windowData.selectedModel,
              fallbackModel,
              models,
            );
            const nextModel = windowData.selectedModel ?? modelOption?.id ?? null;
            const nextEffort = resolveEffortForModel(
              modelOption,
              windowData.selectedEffort,
            );

            if (
              windowData.selectedModel === nextModel &&
              windowData.selectedEffort === nextEffort
            ) {
              return [windowId, windowData];
            }

            changed = true;
            return [
              windowId,
              {
                ...windowData,
                selectedModel: nextModel,
                selectedEffort: nextEffort,
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
    canvasRef: canvas.canvasRef,
    requestGeometryRefresh: canvas.requestGeometryRefresh,
    setAppState,
    windowRefs: canvas.windowRefs,
  });

  const deltaBatcher = useDeltaBatcher(setAppState, canvas.requestGeometryRefresh);

  const syncLeftPaneWidth = useCallback(() => {
    const containerWidth = splitPaneRef.current?.clientWidth;
    if (!containerWidth) {
      return;
    }

    const nextWidth =
      leftPaneWidthRef.current === null
        ? resolveStoredLeftPaneWidth(
            (() => {
              try {
                return window.localStorage.getItem(LEFT_PANE_WIDTH_STORAGE_KEY);
              } catch {
                return null;
              }
            })(),
            containerWidth,
          )
        : clampLeftPaneWidth(leftPaneWidthRef.current, containerWidth);

    setLeftPaneWidthPx((current) => (current === nextWidth ? current : nextWidth));
    leftPaneWidthRef.current = nextWidth;
    persistLeftPaneWidth(nextWidth);
    canvas.requestGeometryRefresh();
  }, [persistLeftPaneWidth, canvas.requestGeometryRefresh]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(syncLeftPaneWidth);

    function handleWindowResize(): void {
      syncLeftPaneWidth();
    }

    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [syncLeftPaneWidth]);

  useEffect(() => {
    function handlePaneResizePointerMove(event: globalThis.PointerEvent): void {
      const interaction = paneResizeRef.current;
      if (!interaction) {
        return;
      }

      const nextWidth = clampLeftPaneWidth(
        interaction.startLeftPaneWidth + (event.clientX - interaction.startClientX),
        interaction.containerWidth,
      );

      setLeftPaneWidthPx((current) => (current === nextWidth ? current : nextWidth));
      leftPaneWidthRef.current = nextWidth;
      canvas.requestGeometryRefresh();
    }

    function finishPaneResize(): void {
      if (!paneResizeRef.current) {
        return;
      }

      paneResizeRef.current = null;
      setIsPaneResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (leftPaneWidthRef.current !== null) {
        persistLeftPaneWidth(leftPaneWidthRef.current);
      }

      canvas.requestGeometryRefresh();
    }

    window.addEventListener("pointermove", handlePaneResizePointerMove);
    window.addEventListener("pointerup", finishPaneResize);
    window.addEventListener("pointercancel", finishPaneResize);

    return () => {
      window.removeEventListener("pointermove", handlePaneResizePointerMove);
      window.removeEventListener("pointerup", finishPaneResize);
      window.removeEventListener("pointercancel", finishPaneResize);
    };
  }, [persistLeftPaneWidth, canvas.requestGeometryRefresh]);

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
    const { models, modelsById, defaultModel } = useModelStore.getState();

    setAppState((current) => {
      const windowData = current.windows[windowId];
      if (!windowData) {
        return current;
      }

      const nextModelOption = resolveModelOption(
        modelsById,
        model,
        defaultModel,
        models,
      );
      const nextEffort = resolveEffortForModel(
        nextModelOption,
        windowData.selectedEffort,
      );

      let nextState = updateWindowModel(current, windowId, model);
      nextState = updateWindowEffort(nextState, windowId, nextEffort);
      return nextState;
    });
  }

  function handleEffortChange(
    windowId: string,
    effort: ReasoningEffort | null,
  ): void {
    setAppState((current) => updateWindowEffort(current, windowId, effort));
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
    const { defaultModel, models, modelsById } = useModelStore.getState();
    const modelOption = resolveModelOption(
      modelsById,
      windowData.selectedModel,
      defaultModel,
      models,
    );
    const resolvedModel = modelOption?.id;
    const resolvedEffort = resolveEffortForModel(
      modelOption,
      windowData.selectedEffort,
    );
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
        effort: resolvedEffort,
        signal: controller.signal,
        onContentDelta: batcher.pushContent,
        onReasoningDelta: batcher.pushReasoning,
      });

      batcher.flush();

      setAppState((current) =>
        completeAssistantMessage(current, windowId, assistantMessage.id),
      );
    } catch (error: unknown) {
      const aborted = isAbortError(error);
      const message = getErrorMessage(error);

      if (!aborted) {
        useNoticeStore.getState().showNotice(message);
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

    const { defaultModel, models, modelsById } = useModelStore.getState();
    const modelOption = resolveModelOption(
      modelsById,
      windowData.selectedModel,
      defaultModel,
      models,
    );
    const resolvedModel = modelOption?.id;
    const resolvedEffort = resolveEffortForModel(
      modelOption,
      windowData.selectedEffort,
    );
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
        effort: resolvedEffort,
        signal: controller.signal,
        onContentDelta: batcher.pushContent,
        onReasoningDelta: batcher.pushReasoning,
      });

      batcher.flush();

      setAppState((current) =>
        completeAssistantMessage(current, windowId, assistantMessage.id),
      );
    } catch (error: unknown) {
      const aborted = isAbortError(error);
      const message = getErrorMessage(error);

      if (!aborted) {
        useNoticeStore.getState().showNotice(message);
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
    const { defaultModel, models, modelsById } = useModelStore.getState();
    setAppState((current) => {
      const canvasWidth = canvas.canvasRef.current?.clientWidth;
      const canvasHeight = canvas.canvasRef.current?.clientHeight;
      const title = getNextRootChatTitle(current.windows);
      const modelOption = resolveModelOption(modelsById, null, defaultModel, models);
      const orderedWindows = current.zOrder
        .map((windowId) => current.windows[windowId])
        .filter((windowData): windowData is WindowRecord => Boolean(windowData));
      const mainWindow =
        orderedWindows.find((windowData) => windowData.parentId === null) ?? null;
      const rightPaneWindows = orderedWindows.filter(
        (windowData) => windowData.id !== mainWindow?.id,
      );
      const floatingRootWindows = rightPaneWindows.filter(
        (windowData) => windowData.parentId === null,
      );
      const fittedPaneSize =
        canvasWidth && canvasHeight
          ? resolveFloatingPaneSize({
              canvasHeight,
              canvasWidth,
              defaultHeight: FLOATING_ROOT_WINDOW_HEIGHT,
              defaultWidth: FLOATING_ROOT_WINDOW_WIDTH,
              minHeight: MIN_WINDOW_HEIGHT,
              minWidth: MIN_WINDOW_WIDTH,
              viewport: current.viewport,
            })
          : null;
      const nextPosition =
        canvasWidth && canvasHeight && fittedPaneSize
          ? getNextOverlappingPanePlacement({
              canvasHeight,
              canvasWidth,
              existingWindows: floatingRootWindows,
              paneHeight: fittedPaneSize.height,
              paneWidth: fittedPaneSize.width,
              viewport: current.viewport,
            })
          : null;
      const rootWindow = createWindowRecord({
        title,
        x:
          nextPosition?.x ??
          getCenteredRootX(fittedPaneSize?.width ?? FLOATING_ROOT_WINDOW_WIDTH),
        y: nextPosition?.y ?? ROOT_WINDOW_Y,
        width: fittedPaneSize?.width ?? FLOATING_ROOT_WINDOW_WIDTH,
        height: fittedPaneSize?.height ?? FLOATING_ROOT_WINDOW_HEIGHT,
        selectedModel: modelOption?.id ?? null,
        selectedEffort: resolveEffortForModel(modelOption, null),
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

  const handleNavigateToBranchSource = useCallback((
    windowId: string,
    branchAnchorId: string | null,
  ): void => {
    const target = resolveBranchSourceNavigation(
      appStateRef.current,
      windowId,
      branchAnchorId,
    );
    if (!target) {
      return;
    }

    const navigationTarget = target;

    selection.dismissSelection();

    if (navigationTarget.shouldBringSourceToFront) {
      canvas.onWindowFocus(navigationTarget.sourceWindowId);
    }

    if (navigationTarget.shouldExpandSourceHistory) {
      setAppState((current) =>
        setWindowHistoryExpanded(current, navigationTarget.sourceWindowId, true),
      );
    }

    let attempts = 0;
    const maxAttempts = 8;

    function scrollToSourceAnchor(): void {
      const anchorNode = canvas.getAnchorNode(navigationTarget.sourceGroupKey);
      if (anchorNode) {
        anchorNode.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        return;
      }

      attempts += 1;
      if (attempts > maxAttempts) {
        return;
      }

      window.requestAnimationFrame(scrollToSourceAnchor);
    }

    window.requestAnimationFrame(scrollToSourceAnchor);
  }, [canvas, selection, setAppState]);

  function handlePaneResizePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ): void {
    if (event.button !== 0) {
      return;
    }

    const containerWidth = splitPaneRef.current?.clientWidth;
    if (!containerWidth) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    selection.dismissSelection();

    const startLeftPaneWidth =
      leftPaneWidthRef.current ?? resolveStoredLeftPaneWidth(null, containerWidth);

    paneResizeRef.current = {
      containerWidth,
      startClientX: event.clientX,
      startLeftPaneWidth,
    };
    setIsPaneResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  const anchorGroupsByMessageKey = useMemo((): AnchorGroupsByMessageKey => {
    return mergeSelectionPreviewAnchorGroup(
      canvas.anchorGroupsByMessageKey,
      selection.selectionState,
    );
  }, [canvas.anchorGroupsByMessageKey, selection.selectionState]);

  const orderedWindows = appState.zOrder
    .map((windowId) => appState.windows[windowId])
    .filter((windowData): windowData is WindowRecord => Boolean(windowData));
  const mainWindow = orderedWindows.find((windowData) => windowData.parentId === null) ?? null;
  const windows = orderedWindows.filter((windowData) => windowData.id !== mainWindow?.id);
  const hasChildWindows = windows.length > 0;

  return {
    anchorGroupsByMessageKey,
    canvasRef: canvas.canvasRef,
    closePrompt,
    connectorPaths: canvas.connectorPaths,
    hasChildWindows,
    isPaneResizing,
    leftPaneWidthPx,
    messagesByWindowId: appState.messagesByWindowId,
    onCanvasPointerDown: (event) => {
      selection.dismissSelection();
      canvas.onCanvasPointerDown(event);
    },
    onCloseAllChildWindows: handleCloseAllChildWindows,
    onClosePromptCancel: dismissClosePrompt,
    onClosePromptConfirm: confirmClosePrompt,
    onComposerChange: handleComposerChange,
    onModelChange: handleModelChange,
    onEffortChange: handleEffortChange,
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
    onNavigateToBranchSource: handleNavigateToBranchSource,
    onOpenFreshRootWindow: openFreshRootWindow,
    onPaneResizePointerDown: handlePaneResizePointerDown,
    onRetry: handleRetry,
    onSelectionExpand: selection.expandSelectionComposer,
    onSelectionBranch: (prompt?: string) => {
      const childWindowId = selection.onSelectionBranch();
      if (childWindowId && prompt?.trim()) {
        pendingBranchSendRef.current = { windowId: childWindowId, prompt: prompt.trim() };
      }
    },
    onSend: handleSend,
    onToggleHistoryExpanded: handleToggleHistoryExpanded,
    onWindowClose: handleClose,
    onWindowFocus: canvas.onWindowFocus,
    onWindowScrollStateChange: handleWindowScrollStateChange,
    popoverRef: selection.popoverRef,
    registerAnchorRef: canvas.registerAnchorRef,
    registerWindowRef: canvas.registerWindowRef,
    selectionState: selection.selectionState,
    splitPaneRef,
    viewport: appState.viewport,
    windowScrollStates: windowScrollStatesRef.current,
    windows,
    mainWindow,
  };
}
