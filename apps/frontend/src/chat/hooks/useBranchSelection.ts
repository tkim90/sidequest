import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type SetStateAction,
} from "react";

import type { AppState, SelectionState } from "../../types";
import { checkAnchorOverlap } from "../lib/anchors";
import {
  CHILD_VERTICAL_STAGGER,
  WINDOW_GAP,
} from "../lib/constants";
import {
  clamp,
  findTextOffsets,
  getRangeRect,
  getRangeWithinContainer,
} from "../lib/geometry";
import {
  cloneMessagesForBranch,
  createAnchorRecord,
  createWindowRecord,
} from "../lib/state";

interface UseBranchSelectionOptions {
  appStateRef: RefObject<AppState>;
  requestGeometryRefresh: () => void;
  setAppState: Dispatch<SetStateAction<AppState>>;
  setNotice: Dispatch<SetStateAction<string>>;
  windowRefs: RefObject<Record<string, HTMLElement>>;
}

interface UseBranchSelectionResult {
  dismissSelection: () => void;
  onMessageMouseUp: (
    event: ReactMouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onSelectionBranch: () => void;
  popoverRef: RefObject<HTMLDivElement | null>;
  selectionState: SelectionState | null;
}

export function useBranchSelection({
  appStateRef,
  requestGeometryRefresh,
  setAppState,
  setNotice,
  windowRefs,
}: UseBranchSelectionOptions): UseBranchSelectionResult {
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function clearSelectionOnOutsideClick(event: globalThis.MouseEvent): void {
      if (!selectionState) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && popoverRef.current?.contains(target)) {
        return;
      }

      dismissSelection();
    }

    document.addEventListener("mousedown", clearSelectionOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", clearSelectionOnOutsideClick);
    };
  }, [selectionState]);

  function dismissSelection(): void {
    setSelectionState(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleMessageMouseUp(
    event: ReactMouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ): void {
    const messageNode = event.currentTarget;

    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      const selectionRange = selection.getRangeAt(0);
      const range = getRangeWithinContainer(messageNode, selectionRange);

      if (!range) {
        return;
      }

      const { selectedText, startOffset, endOffset } = findTextOffsets(
        messageNode,
        range,
      );
      const trimmedText = selectedText.trim();
      const leadingWhitespace =
        selectedText.length - selectedText.trimStart().length;
      const trailingWhitespace =
        selectedText.length - selectedText.trimEnd().length;
      const adjustedStartOffset = startOffset + leadingWhitespace;
      const adjustedEndOffset = endOffset - trailingWhitespace;

      if (!trimmedText || adjustedStartOffset === adjustedEndOffset) {
        return;
      }

      const overlap = checkAnchorOverlap({
        anchors: appStateRef.current.anchors,
        parentWindowId: windowId,
        parentMessageId: messageId,
        startOffset: adjustedStartOffset,
        endOffset: adjustedEndOffset,
      });

      if (overlap.type === "partial") {
        setNotice(
          "Overlapping branch anchors in the same message are blocked in this version.",
        );
        dismissSelection();
        return;
      }

      const rangeRect = getRangeRect(range);
      const windowRect = windowRefs.current[windowId]?.getBoundingClientRect();

      if (!rangeRect) {
        return;
      }

      setSelectionState({
        parentWindowId: windowId,
        parentMessageId: messageId,
        selectedText: trimmedText,
        startOffset: adjustedStartOffset,
        endOffset: adjustedEndOffset,
        x: rangeRect.left + rangeRect.width / 2,
        y: rangeRect.bottom + 10,
        windowLocalY: windowRect
          ? rangeRect.top + rangeRect.height / 2 - windowRect.top
          : 120,
      });
    });
  }

  function createBranchFromSelection(): void {
    const currentSelection = selectionState;
    if (!currentSelection) {
      return;
    }

    const snapshot = appStateRef.current;
    const parentWindow = snapshot.windows[currentSelection.parentWindowId];
    const parentMessages =
      snapshot.messagesByWindowId[currentSelection.parentWindowId] || [];

    if (!parentWindow) {
      dismissSelection();
      return;
    }

    const anchorIndex = parentMessages.findIndex(
      (message) => message.id === currentSelection.parentMessageId,
    );

    if (anchorIndex < 0) {
      dismissSelection();
      return;
    }

    const anchorMessage = parentMessages[anchorIndex];
    if (!anchorMessage) {
      dismissSelection();
      return;
    }

    const overlap = checkAnchorOverlap({
      anchors: snapshot.anchors,
      parentWindowId: currentSelection.parentWindowId,
      parentMessageId: currentSelection.parentMessageId,
      startOffset: currentSelection.startOffset,
      endOffset: currentSelection.endOffset,
    });

    if (overlap.type === "partial") {
      setNotice(
        "Overlapping branch anchors in the same message are blocked in this version.",
      );
      dismissSelection();
      return;
    }

    const childWindow = createWindowRecord({
      title: `${parentWindow.title}.${parentWindow.childIds.length + 1}`,
      x: parentWindow.x + parentWindow.width + WINDOW_GAP,
      y:
        parentWindow.y +
        clamp(currentSelection.windowLocalY - 120, 24, 260) +
        parentWindow.childIds.length * CHILD_VERTICAL_STAGGER,
      parentId: parentWindow.id,
      branchFocus: {
        selectedText: currentSelection.selectedText,
        parentWindowTitle: parentWindow.title,
        parentMessageRole: anchorMessage.role,
      },
    });

    const anchor = createAnchorRecord({
      parentWindowId: parentWindow.id,
      parentMessageId: currentSelection.parentMessageId,
      childWindowId: childWindow.id,
      selectedText: currentSelection.selectedText,
      startOffset: currentSelection.startOffset,
      endOffset: currentSelection.endOffset,
    });

    const inheritedMessages = cloneMessagesForBranch(
      parentMessages.slice(0, anchorIndex + 1),
    );

    setAppState((current) => {
      const currentParentWindow = current.windows[parentWindow.id];
      if (!currentParentWindow) {
        return current;
      }

      return {
        ...current,
        windows: {
          ...current.windows,
          [parentWindow.id]: {
            ...currentParentWindow,
            childIds: [...currentParentWindow.childIds, childWindow.id],
          },
          [childWindow.id]: {
            ...childWindow,
            branchAnchorId: anchor.id,
          },
        },
        zOrder: [
          ...current.zOrder.filter((windowId) => windowId !== childWindow.id),
          childWindow.id,
        ],
        messagesByWindowId: {
          ...current.messagesByWindowId,
          [childWindow.id]: inheritedMessages,
        },
        anchors: {
          ...current.anchors,
          [anchor.id]: {
            ...anchor,
            groupKey: overlap.groupKey,
          },
        },
      };
    });

    dismissSelection();
    requestGeometryRefresh();
  }

  return {
    dismissSelection,
    onMessageMouseUp: handleMessageMouseUp,
    onSelectionBranch: createBranchFromSelection,
    popoverRef,
    selectionState,
  };
}
