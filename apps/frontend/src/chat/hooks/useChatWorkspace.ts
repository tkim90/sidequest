import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import type {
  AppState,
  ChatMessage,
  ClosePrompt,
  MessagesByWindowId,
  SelectionState,
  WindowRecord,
} from "../../types";
import { streamChat } from "../api/streamChat";
import {
  ROOT_WINDOW_TITLE,
  ROOT_WINDOW_X,
  ROOT_WINDOW_Y,
} from "../lib/constants";
import { getErrorMessage, isAbortError } from "../lib/errors";
import {
  createMessage,
  createWindowRecord,
  getCanvasMessages,
  getDescendantIds,
  createInitialState,
} from "../lib/state";
import { useBranchSelection } from "./useBranchSelection";
import { useCanvasInteractions } from "./useCanvasInteractions";

export interface ChatWorkspaceViewModel {
  anchorGroupsByMessageKey: ReturnType<
    typeof useCanvasInteractions
  >["anchorGroupsByMessageKey"];
  canvasRef: RefObject<HTMLDivElement | null>;
  closePrompt: ClosePrompt | null;
  connectorPaths: ReturnType<typeof useCanvasInteractions>["connectorPaths"];
  messagesByWindowId: MessagesByWindowId;
  notice: string;
  onCanvasPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onClosePromptCancel: () => void;
  onClosePromptConfirm: () => void;
  onComposerChange: (windowId: string, composer: string) => void;
  onGeometryChange: () => void;
  onHeaderPointerDown: ReturnType<
    typeof useCanvasInteractions
  >["onHeaderPointerDown"];
  onMessageMouseUp: ReturnType<
    typeof useBranchSelection
  >["onMessageMouseUp"];
  onOpenFreshRootWindow: () => void;
  onSelectionBranch: () => void;
  onSend: (windowId: string) => Promise<void>;
  onWindowClose: (windowId: string) => void;
  onWindowFocus: (windowId: string) => void;
  popoverRef: RefObject<HTMLDivElement | null>;
  registerAnchorRef: ReturnType<
    typeof useCanvasInteractions
  >["registerAnchorRef"];
  registerWindowRef: ReturnType<
    typeof useCanvasInteractions
  >["registerWindowRef"];
  selectionState: SelectionState | null;
  viewport: AppState["viewport"];
  windows: WindowRecord[];
}

export function useChatWorkspace(): ChatWorkspaceViewModel {
  const [appState, setAppState] = useState<AppState>(createInitialState);
  const [closePrompt, setClosePrompt] = useState<ClosePrompt | null>(null);
  const [notice, setNotice] = useState("");
  const appStateRef = useRef(appState);
  const abortControllersRef = useRef<Record<string, AbortController>>({});

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

  function handleComposerChange(windowId: string, composer: string): void {
    setAppState((current) => {
      const windowData = current.windows[windowId];
      if (!windowData) {
        return current;
      }

      return {
        ...current,
        windows: {
          ...current.windows,
          [windowId]: {
            ...windowData,
            composer,
          },
        },
      };
    });
  }

  async function handleSend(windowId: string): Promise<void> {
    const snapshot = appStateRef.current;
    const windowData = snapshot.windows[windowId];
    if (!windowData) {
      return;
    }

    const composer = windowData.composer.trim();
    if (!composer || windowData.isStreaming) {
      return;
    }

    canvas.onWindowFocus(windowId);
    selection.dismissSelection();

    const userMessage = createMessage("user", composer);
    const assistantMessage = createMessage("assistant", "", "streaming");
    const requestMessages: ChatMessage[] = [
      ...getCanvasMessages(snapshot.messagesByWindowId, windowId),
      { role: "user", content: composer },
    ];

    setAppState((current) => {
      const currentWindow = current.windows[windowId];
      if (!currentWindow) {
        return current;
      }

      return {
        ...current,
        windows: {
          ...current.windows,
          [windowId]: {
            ...currentWindow,
            composer: "",
            isStreaming: true,
          },
        },
        messagesByWindowId: {
          ...current.messagesByWindowId,
          [windowId]: [
            ...(current.messagesByWindowId[windowId] || []),
            userMessage,
            assistantMessage,
          ],
        },
      };
    });

    const controller = new AbortController();
    abortControllersRef.current[windowId] = controller;

    try {
      await streamChat({
        messages: requestMessages,
        branchFocus: windowData.branchFocus,
        signal: controller.signal,
        onDelta: (delta) => {
          setAppState((current) => {
            const messages = current.messagesByWindowId[windowId];
            const currentWindow = current.windows[windowId];
            if (!messages || !currentWindow) {
              return current;
            }

            return {
              ...current,
              messagesByWindowId: {
                ...current.messagesByWindowId,
                [windowId]: messages.map((message) =>
                  message.id === assistantMessage.id
                    ? {
                        ...message,
                        content: `${message.content}${delta}`,
                      }
                    : message,
                ),
              },
            };
          });
          canvas.requestGeometryRefresh();
        },
      });

      setAppState((current) => {
        const messages = current.messagesByWindowId[windowId];
        const currentWindow = current.windows[windowId];
        if (!messages || !currentWindow) {
          return current;
        }

        return {
          ...current,
          windows: {
            ...current.windows,
            [windowId]: {
              ...currentWindow,
              isStreaming: false,
            },
          },
          messagesByWindowId: {
            ...current.messagesByWindowId,
            [windowId]: messages.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, status: "complete" }
                : message,
            ),
          },
        };
      });
    } catch (error: unknown) {
      const aborted = isAbortError(error);
      const message = getErrorMessage(error);

      if (!aborted) {
        setNotice(message);
      }

      setAppState((current) => {
        const messages = current.messagesByWindowId[windowId];
        const currentWindow = current.windows[windowId];
        if (!messages || !currentWindow) {
          return current;
        }

        return {
          ...current,
          windows: {
            ...current.windows,
            [windowId]: {
              ...currentWindow,
              isStreaming: false,
            },
          },
          messagesByWindowId: {
            ...current.messagesByWindowId,
            [windowId]: messages.map((currentMessage) =>
              currentMessage.id === assistantMessage.id
                ? {
                    ...currentMessage,
                    content: aborted
                      ? "Streaming stopped."
                      : `Sorry, something went wrong: ${message}`,
                    status: "complete",
                  }
                : currentMessage,
            ),
          },
        };
      });
    } finally {
      delete abortControllersRef.current[windowId];
      canvas.requestGeometryRefresh();
    }
  }

  function removeWindows(windowIds: string[]): void {
    const doomed = new Set(windowIds);

    windowIds.forEach((windowId) => {
      abortControllersRef.current[windowId]?.abort();
      delete abortControllersRef.current[windowId];
      delete canvas.windowRefs.current[windowId];
    });

    setAppState((current) => {
      const remainingWindows = Object.fromEntries(
        Object.entries(current.windows)
          .filter(([windowId]) => !doomed.has(windowId))
          .map(([windowId, windowData]) => [
            windowId,
            {
              ...windowData,
              childIds: windowData.childIds.filter(
                (childId) => !doomed.has(childId),
              ),
            },
          ]),
      );

      const remainingMessages = Object.fromEntries(
        Object.entries(current.messagesByWindowId).filter(
          ([windowId]) => !doomed.has(windowId),
        ),
      );

      const remainingAnchors = Object.fromEntries(
        Object.entries(current.anchors).filter(([, anchor]) => {
          return (
            !doomed.has(anchor.parentWindowId) &&
            !doomed.has(anchor.childWindowId)
          );
        }),
      );

      return {
        ...current,
        windows: remainingWindows,
        zOrder: current.zOrder.filter((windowId) => !doomed.has(windowId)),
        messagesByWindowId: remainingMessages,
        anchors: remainingAnchors,
      };
    });

    selection.dismissSelection();
    setClosePrompt(null);
    canvas.requestGeometryRefresh();
  }

  function handleClose(windowId: string): void {
    const snapshot = appStateRef.current;
    const descendants = getDescendantIds(snapshot.windows, windowId);

    if (descendants.length === 0) {
      removeWindows([windowId]);
      return;
    }

    setClosePrompt({
      windowId,
      descendantIds: descendants,
      descendantTitles: descendants
        .map((descendantId) => snapshot.windows[descendantId]?.title)
        .filter((title): title is string => Boolean(title)),
    });
  }

  function dismissClosePrompt(): void {
    setClosePrompt(null);
  }

  function confirmClosePrompt(): void {
    if (!closePrompt) {
      return;
    }

    removeWindows([closePrompt.windowId, ...closePrompt.descendantIds]);
  }

  function openFreshRootWindow(): void {
    const rootWindow = createWindowRecord({
      title: ROOT_WINDOW_TITLE,
      x: ROOT_WINDOW_X,
      y: ROOT_WINDOW_Y,
    });

    setAppState((current) => ({
      ...current,
      windows: {
        ...current.windows,
        [rootWindow.id]: rootWindow,
      },
      zOrder: [...current.zOrder, rootWindow.id],
      messagesByWindowId: {
        ...current.messagesByWindowId,
        [rootWindow.id]: [],
      },
    }));
  }

  const windows = appState.zOrder
    .map((windowId) => appState.windows[windowId])
    .filter((windowData): windowData is WindowRecord => Boolean(windowData));

  return {
    anchorGroupsByMessageKey: canvas.anchorGroupsByMessageKey,
    canvasRef: canvas.canvasRef,
    closePrompt,
    connectorPaths: canvas.connectorPaths,
    messagesByWindowId: appState.messagesByWindowId,
    notice,
    onCanvasPointerDown: (event) => {
      selection.dismissSelection();
      canvas.onCanvasPointerDown(event);
    },
    onClosePromptCancel: dismissClosePrompt,
    onClosePromptConfirm: confirmClosePrompt,
    onComposerChange: handleComposerChange,
    onGeometryChange: canvas.requestGeometryRefresh,
    onHeaderPointerDown: (event, windowId) => {
      selection.dismissSelection();
      canvas.onHeaderPointerDown(event, windowId);
    },
    onMessageMouseUp: selection.onMessageMouseUp,
    onOpenFreshRootWindow: openFreshRootWindow,
    onSelectionBranch: selection.onSelectionBranch,
    onSend: handleSend,
    onWindowClose: handleClose,
    onWindowFocus: canvas.onWindowFocus,
    popoverRef: selection.popoverRef,
    registerAnchorRef: canvas.registerAnchorRef,
    registerWindowRef: canvas.registerWindowRef,
    selectionState: selection.selectionState,
    viewport: appState.viewport,
    windows,
  };
}
