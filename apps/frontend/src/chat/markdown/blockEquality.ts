import type { MarkdownBlock, OrderedListItem } from "./types";

function orderedListItemsEqual(a: OrderedListItem[], b: OrderedListItem[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    if (a[index].index !== b[index].index || a[index].text !== b[index].text) {
      return false;
    }
  }

  return true;
}

function stringArrayEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }

  return true;
}

export function blocksEqual(
  a: MarkdownBlock | null,
  b: MarkdownBlock | null,
): boolean {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  if (a.id !== b.id || a.type !== b.type) {
    return false;
  }

  if (a.type === "header" && b.type === "header") {
    return a.level === b.level && a.text === b.text;
  }

  if (a.type === "paragraph" && b.type === "paragraph") {
    return a.text === b.text;
  }

  if (a.type === "blockquote" && b.type === "blockquote") {
    return a.text === b.text;
  }

  if (a.type === "unordered_list" && b.type === "unordered_list") {
    return stringArrayEqual(a.items, b.items);
  }

  if (a.type === "ordered_list" && b.type === "ordered_list") {
    return orderedListItemsEqual(a.items, b.items);
  }

  if (a.type === "code" && b.type === "code") {
    return a.language === b.language && a.code === b.code;
  }

  if (a.type === "table" && b.type === "table") {
    if (!stringArrayEqual(a.headers, b.headers)) {
      return false;
    }
    if (!stringArrayEqual(a.alignments, b.alignments)) {
      return false;
    }
    if (a.rows.length !== b.rows.length) {
      return false;
    }

    for (let index = 0; index < a.rows.length; index += 1) {
      if (!stringArrayEqual(a.rows[index], b.rows[index])) {
        return false;
      }
    }

    return true;
  }

  return false;
}
