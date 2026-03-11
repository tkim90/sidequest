import {
  useCallback,
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
  getSelectionRect,
} from "../lib/geometry";
import {
  cloneMessagesForBranch,
  createAnchorRecord,
  createWindowRecord,
} from "../lib/state";
import { computeBlockOffsets, getRenderedTextForBlock } from "../markdown/offsetMap";
import { parseAllBlocks } from "../markdown/parser";

interface UseBranchSelectionOptions {
  appStateRef: RefObject<AppState>;
  requestGeometryRefresh: () => void;
  setAppState: Dispatch<SetStateAction<AppState>>;
  setNotice: Dispatch<SetStateAction<string>>;
  windowRefs: RefObject<Record<string, HTMLElement>>;
}

interface MouseDownContext {
  windowId: string;
  messageId: string;
  node: HTMLElement;
}

interface UseBranchSelectionResult {
  dismissSelection: () => void;
  onMessageMouseDown: (
    event: ReactMouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onSelectionBranch: () => string | null;
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
  const mouseDownRef = useRef<MouseDownContext | null>(null);

  useEffect(() => {
    function clearSelectionOnOutsideClick(event: globalThis.MouseEvent): void {
      if (!selectionState) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && popoverRef.current?.contains(target)) {
        return;
      }

      // Don't clear selection on mousedown within message text. If we clear
      // selectionState here, React unmounts the preview highlight <span>s,
      // which can destroy the browser's selection anchor mid-drag. Instead,
      // let handleDocumentMouseUp manage the transition.
      if (target instanceof Element && target.closest('[data-message-id]')) return;
      setSelectionState(null);
    }

    document.addEventListener("mousedown", clearSelectionOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", clearSelectionOnOutsideClick);
    };
  }, [selectionState]);

  // Document-level mouseup listener to detect selection even when mouse
  // is released outside the message div.
  useEffect(() => {
    function handleDocumentMouseUp(): void {
      const ctx = mouseDownRef.current;
      if (!ctx) {
        return;
      }
      mouseDownRef.current = null;

      const { windowId, messageId, node } = ctx;

      requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          setSelectionState(null);
          return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText) {
          return;
        }

        const rect = getSelectionRect(selection, node);
        if (!rect) {
          return;
        }

        const windowRect = windowRefs.current[windowId]?.getBoundingClientRect();

        // Eagerly compute offsets so the preview highlight can render
        // even after the browser clears the native selection (autoFocus).
        const snapshot = appStateRef.current;
        const messages = snapshot.messagesByWindowId[windowId] || [];
        const anchorMessage = messages.find((m) => m.id === messageId);
        const offsets = anchorMessage
          ? computeOffsetsForSelectedText(anchorMessage.content, selectedText)
          : null;

        setSelectionState({
          parentWindowId: windowId,
          parentMessageId: messageId,
          selectedText,
          ...(offsets && { startOffset: offsets.startOffset, endOffset: offsets.endOffset }),
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
          windowLocalY: windowRect
            ? rect.top + rect.height / 2 - windowRect.top
            : 120,
        });
      });
    }

    document.addEventListener("mouseup", handleDocumentMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, []);

  function dismissSelection(): void {
    setSelectionState(null);
    window.getSelection()?.removeAllRanges();
  }

  const handleMessageMouseDown = useCallback(
    (
      event: ReactMouseEvent<HTMLDivElement>,
      windowId: string,
      messageId: string,
    ): void => {
      mouseDownRef.current = {
        windowId,
        messageId,
        node: event.currentTarget,
      };
    },
    [],
  );

  function computeOffsetsForSelectedText(
    messageContent: string,
    selectedText: string,
  ): { startOffset: number; endOffset: number } | null {
    const blocks = parseAllBlocks(messageContent);
    const blockOffsets = computeBlockOffsets(blocks);
    const renderedSegments = blocks.map((b) => getRenderedTextForBlock(b));
    const fullRendered = renderedSegments.join("\n");

    // Try exact match in full rendered text
    const idx = fullRendered.indexOf(selectedText);
    if (idx >= 0) {
      return { startOffset: idx, endOffset: idx + selectedText.length };
    }

    // Browser selection may produce double newlines between block-level
    // elements (e.g. <p>…</p><p>…</p>), but rendered segments are joined
    // with a single "\n". Collapse runs of 2+ newlines to retry.
    const normalizedSelected = selectedText.replace(/[ \t]*\n([ \t]*\n)+[ \t]*/g, "\n");
    if (normalizedSelected !== selectedText) {
      const nIdx = fullRendered.indexOf(normalizedSelected);
      if (nIdx >= 0) {
        return { startOffset: nIdx, endOffset: nIdx + normalizedSelected.length };
      }
    }

    // Fallback: match against individual blocks (handles code blocks
    // where DOM selection includes language label / button text)
    for (let i = 0; i < blocks.length; i++) {
      const blockText = renderedSegments[i];
      const bo = blockOffsets[i];

      if (selectedText.includes(blockText) && blockText.length > 0) {
        return { startOffset: bo.renderedStart, endOffset: bo.renderedEnd };
      }

      const inner = blockText.indexOf(selectedText);
      if (inner >= 0) {
        return {
          startOffset: bo.renderedStart + inner,
          endOffset: bo.renderedStart + inner + selectedText.length,
        };
      }

      // Retry per-block match with normalized selection text
      if (normalizedSelected !== selectedText) {
        if (normalizedSelected.includes(blockText) && blockText.length > 0) {
          return { startOffset: bo.renderedStart, endOffset: bo.renderedEnd };
        }

        const nInner = blockText.indexOf(normalizedSelected);
        if (nInner >= 0) {
          return {
            startOffset: bo.renderedStart + nInner,
            endOffset: bo.renderedStart + nInner + normalizedSelected.length,
          };
        }
      }
    }

    return null;
  }

  function createBranchFromSelection(): string | null {
    const currentSelection = selectionState;
    if (!currentSelection) {
      return null;
    }

    const snapshot = appStateRef.current;
    const parentWindow = snapshot.windows[currentSelection.parentWindowId];
    const parentMessages =
      snapshot.messagesByWindowId[currentSelection.parentWindowId] || [];

    if (!parentWindow) {
      dismissSelection();
      return null;
    }

    const anchorIndex = parentMessages.findIndex(
      (message) => message.id === currentSelection.parentMessageId,
    );

    if (anchorIndex < 0) {
      dismissSelection();
      return null;
    }

    const anchorMessage = parentMessages[anchorIndex];
    if (!anchorMessage) {
      dismissSelection();
      return null;
    }

    // Resolve offsets: use existing ones if available, otherwise compute from content
    let startOffset = currentSelection.startOffset;
    let endOffset = currentSelection.endOffset;

    if (startOffset === undefined || endOffset === undefined) {
      const computed = computeOffsetsForSelectedText(
        anchorMessage.content,
        currentSelection.selectedText,
      );

      if (!computed) {
        setNotice(
          "Could not determine selection position. Try selecting again.",
        );
        dismissSelection();
        return null;
      }

      startOffset = computed.startOffset;
      endOffset = computed.endOffset;
    }

    const overlap = checkAnchorOverlap({
      anchors: snapshot.anchors,
      parentWindowId: currentSelection.parentWindowId,
      parentMessageId: currentSelection.parentMessageId,
      startOffset,
      endOffset,
    });

    if (overlap.type === "partial") {
      setNotice(
        "Overlapping branch anchors in the same message are blocked in this version.",
      );
      dismissSelection();
      return null;
    }

    const inheritedMessages = cloneMessagesForBranch(
      parentMessages.slice(0, anchorIndex + 1),
    );

    const childWindow = createWindowRecord({
      title: `${parentWindow.title}.${parentWindow.childIds.length + 1}`,
      x: parentWindow.x + parentWindow.width + WINDOW_GAP,
      y:
        parentWindow.y +
        clamp(currentSelection.windowLocalY - 120, 24, 260) +
        parentWindow.childIds.length * CHILD_VERTICAL_STAGGER,
      parentId: parentWindow.id,
      selectedModel: parentWindow.selectedModel,
      branchFocus: {
        selectedText: currentSelection.selectedText,
        parentWindowTitle: parentWindow.title,
        parentMessageRole: anchorMessage.role,
      },
      inheritedMessageCount: inheritedMessages.length,
      isHistoryExpanded: inheritedMessages.length === 0,
    });

    const anchor = createAnchorRecord({
      parentWindowId: parentWindow.id,
      parentMessageId: currentSelection.parentMessageId,
      childWindowId: childWindow.id,
      selectedText: currentSelection.selectedText,
      startOffset,
      endOffset,
    });

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

    return childWindow.id;
  }

  return {
    dismissSelection,
    onMessageMouseDown: handleMessageMouseDown,
    onSelectionBranch: createBranchFromSelection,
    popoverRef,
    selectionState,
  };
}
