import type {
  AnchorGroup,
  AnchorGroupsByMessageKey,
  AnchorMap,
  AnchorOverlapResult,
} from "../../types";
import { createAnchorGroupKey } from "./state";

interface CheckAnchorOverlapOptions {
  anchors: AnchorMap;
  parentWindowId: string;
  parentMessageId: string;
  startOffset: number;
  endOffset: number;
}

export function groupAnchorsByMessage(
  anchors: AnchorMap,
): AnchorGroupsByMessageKey {
  const grouped: Record<string, Record<string, AnchorGroup>> = {};

  Object.values(anchors).forEach((anchor) => {
    const messageKey = `${anchor.parentWindowId}:${anchor.parentMessageId}`;

    if (!grouped[messageKey]) {
      grouped[messageKey] = {};
    }

    if (!grouped[messageKey][anchor.groupKey]) {
      grouped[messageKey][anchor.groupKey] = {
        key: anchor.groupKey,
        startOffset: anchor.startOffset,
        endOffset: anchor.endOffset,
        anchorIds: [],
      };
    }

    grouped[messageKey][anchor.groupKey].anchorIds.push(anchor.id);
  });

  return Object.fromEntries(
    Object.entries(grouped).map(([messageKey, groups]) => [
      messageKey,
      Object.values(groups).sort(
        (left, right) => left.startOffset - right.startOffset,
      ),
    ]),
  ) as AnchorGroupsByMessageKey;
}

export function checkAnchorOverlap({
  anchors,
  parentWindowId,
  parentMessageId,
  startOffset,
  endOffset,
}: CheckAnchorOverlapOptions): AnchorOverlapResult {
  const siblings = Object.values(anchors).filter(
    (anchor) =>
      anchor.parentWindowId === parentWindowId &&
      anchor.parentMessageId === parentMessageId,
  );

  for (const anchor of siblings) {
    const sameRange =
      anchor.startOffset === startOffset && anchor.endOffset === endOffset;
    const overlaps =
      startOffset < anchor.endOffset && endOffset > anchor.startOffset;

    if (sameRange) {
      return { type: "exact", groupKey: anchor.groupKey };
    }

    if (overlaps) {
      return { type: "partial" };
    }
  }

  return {
    type: "clear",
    groupKey: createAnchorGroupKey({
      parentWindowId,
      parentMessageId,
      startOffset,
      endOffset,
    }),
  };
}
