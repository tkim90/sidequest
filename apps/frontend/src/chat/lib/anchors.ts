import type {
  AnchorGroup,
  AnchorGroupsByMessageKey,
  AnchorMap,
  AnchorOverlapResult,
  MessageContentSegment,
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

export function splitContentByAnchors(
  content: string,
  anchorGroups: AnchorGroup[],
): MessageContentSegment[] {
  if (anchorGroups.length === 0) {
    return [{ type: "text", text: content }];
  }

  const segments: MessageContentSegment[] = [];
  let cursor = 0;

  anchorGroups.forEach((group) => {
    if (cursor < group.startOffset) {
      segments.push({
        type: "text",
        text: content.slice(cursor, group.startOffset),
      });
    }

    segments.push({
      type: "anchor",
      key: group.key,
      text: content.slice(group.startOffset, group.endOffset),
      count: group.anchorIds.length,
    });

    cursor = group.endOffset;
  });

  if (cursor < content.length) {
    segments.push({
      type: "text",
      text: content.slice(cursor),
    });
  }

  return segments;
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
