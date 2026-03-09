import type {
  HeaderBlock,
  MarkdownBlock,
  OrderedListItem,
  ParserState,
  TableAlignment,
} from "./types";

export function appendLine(existingText: string, line: string): string {
  return existingText.length === 0 ? line : `${existingText}\n${line}`;
}

export function parseHeaderLine(
  line: string,
): { level: HeaderBlock["level"]; text: string } | null {
  const headerMatch = /^(#{1,6})\s+(.*)$/.exec(line);
  if (!headerMatch) {
    return null;
  }

  return {
    level: headerMatch[1].length as HeaderBlock["level"],
    text: headerMatch[2],
  };
}

export function parseFenceLanguage(line: string): string | null {
  const trimmedStart = line.trimStart();
  if (!trimmedStart.startsWith("```")) {
    return null;
  }

  return trimmedStart.slice(3).trim();
}

export function isClosingFence(line: string): boolean {
  return line.trim() === "```";
}

export function parseBlockquoteLine(line: string): string | null {
  const blockquoteMatch = /^\s{0,3}>\s?(.*)$/.exec(line);
  if (!blockquoteMatch) {
    return null;
  }

  return blockquoteMatch[1];
}

export function parseUnorderedListItem(line: string): string | null {
  const unorderedMatch = /^\s{0,3}-\s+(.*)$/.exec(line);
  if (!unorderedMatch) {
    return null;
  }

  return unorderedMatch[1];
}

export function parseOrderedListItem(line: string): OrderedListItem | null {
  const orderedMatch = /^\s{0,3}(\d+)\.\s+(.*)$/.exec(line);
  if (!orderedMatch) {
    return null;
  }

  return {
    index: Number(orderedMatch[1]),
    text: orderedMatch[2],
  };
}

export function parseTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return null;
  }

  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());

  if (cells.length < 2) {
    return null;
  }

  return cells;
}

export function parseTableSeparator(line: string): TableAlignment[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return null;
  }

  const cells = trimmed.slice(1, -1).split("|");
  if (cells.length < 2) {
    return null;
  }

  const alignments: TableAlignment[] = [];
  for (const cell of cells) {
    const trimmedCell = cell.trim();
    if (!/^:?-{1,}:?$/.test(trimmedCell)) {
      return null;
    }

    const left = trimmedCell.startsWith(":");
    const right = trimmedCell.endsWith(":");
    if (left && right) {
      alignments.push("center");
    } else if (right) {
      alignments.push("right");
    } else {
      alignments.push("left");
    }
  }

  return alignments;
}

export function normalizeRowToColumnCount(
  cells: string[],
  count: number,
): string[] {
  if (cells.length === count) {
    return cells;
  }

  if (cells.length > count) {
    return cells.slice(0, count);
  }

  const padded = [...cells];
  while (padded.length < count) {
    padded.push("");
  }
  return padded;
}

export function deriveActiveBlock(parser: ParserState): MarkdownBlock | null {
  if (parser.mode === "code") {
    if (parser.codeId === null) {
      return null;
    }

    const code =
      parser.lineBuffer.length === 0
        ? parser.codeText
        : appendLine(parser.codeText, parser.lineBuffer);

    return {
      id: parser.codeId,
      type: "code",
      language: parser.codeLanguage,
      code,
    };
  }

  if (parser.paragraphId !== null) {
    const paragraph =
      parser.lineBuffer.length === 0
        ? parser.paragraphText
        : appendLine(parser.paragraphText, parser.lineBuffer);

    if (paragraph.length === 0) {
      return null;
    }

    return {
      id: parser.paragraphId,
      type: "paragraph",
      text: paragraph,
    };
  }

  if (parser.blockquoteId !== null) {
    const blockquote =
      parser.lineBuffer.length === 0
        ? parser.blockquoteText
        : (() => {
            const pendingBlockquoteLine = parseBlockquoteLine(parser.lineBuffer);
            if (pendingBlockquoteLine === null) {
              return parser.blockquoteText;
            }
            return appendLine(parser.blockquoteText, pendingBlockquoteLine);
          })();

    if (blockquote.length === 0) {
      return null;
    }

    return {
      id: parser.blockquoteId,
      type: "blockquote",
      text: blockquote,
    };
  }

  if (parser.unorderedListId !== null) {
    const items =
      parser.lineBuffer.length === 0
        ? parser.unorderedListItems
        : (() => {
            const pendingItem = parseUnorderedListItem(parser.lineBuffer);
            if (pendingItem === null) {
              return parser.unorderedListItems;
            }
            return [...parser.unorderedListItems, pendingItem];
          })();

    if (items.length === 0) {
      return null;
    }

    return {
      id: parser.unorderedListId,
      type: "unordered_list",
      items,
    };
  }

  if (parser.orderedListId !== null) {
    const items =
      parser.lineBuffer.length === 0
        ? parser.orderedListItems
        : (() => {
            const pendingItem = parseOrderedListItem(parser.lineBuffer);
            if (pendingItem === null) {
              return parser.orderedListItems;
            }
            return [...parser.orderedListItems, pendingItem];
          })();

    if (items.length === 0) {
      return null;
    }

    return {
      id: parser.orderedListId,
      type: "ordered_list",
      items,
    };
  }

  if (parser.tableId !== null) {
    const rows =
      parser.lineBuffer.length === 0
        ? parser.tableRows
        : (() => {
            const pendingRow = parseTableRow(parser.lineBuffer);
            if (pendingRow === null) {
              return parser.tableRows;
            }
            return [
              ...parser.tableRows,
              normalizeRowToColumnCount(pendingRow, parser.tableHeaders.length),
            ];
          })();

    return {
      id: parser.tableId,
      type: "table",
      headers: parser.tableHeaders,
      alignments: parser.tableAlignments,
      rows,
    };
  }

  if (parser.lineBuffer.length === 0) {
    return null;
  }

  if (parser.linePreviewId === null) {
    parser.linePreviewId = parser.nextId++;
  }

  const maybeHeader = parseHeaderLine(parser.lineBuffer);
  if (maybeHeader) {
    return {
      id: parser.linePreviewId,
      type: "header",
      level: maybeHeader.level,
      text: maybeHeader.text,
    };
  }

  const maybeBlockquote = parseBlockquoteLine(parser.lineBuffer);
  if (maybeBlockquote !== null) {
    return {
      id: parser.linePreviewId,
      type: "blockquote",
      text: maybeBlockquote,
    };
  }

  const maybeUnorderedListItem = parseUnorderedListItem(parser.lineBuffer);
  if (maybeUnorderedListItem !== null) {
    return {
      id: parser.linePreviewId,
      type: "unordered_list",
      items: [maybeUnorderedListItem],
    };
  }

  const maybeOrderedListItem = parseOrderedListItem(parser.lineBuffer);
  if (maybeOrderedListItem !== null) {
    return {
      id: parser.linePreviewId,
      type: "ordered_list",
      items: [maybeOrderedListItem],
    };
  }

  return {
    id: parser.linePreviewId,
    type: "paragraph",
    text: parser.lineBuffer,
  };
}
