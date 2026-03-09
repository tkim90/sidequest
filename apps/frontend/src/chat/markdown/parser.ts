import type { MarkdownBlock, ParseResult, ParserState } from "./types";

import { blocksEqual } from "./blockEquality";
import { createParserState } from "./parserState";
import {
  appendLine,
  deriveActiveBlock,
  isClosingFence,
  normalizeRowToColumnCount,
  parseBlockquoteLine,
  parseFenceLanguage,
  parseHeaderLine,
  parseOrderedListItem,
  parseTableRow,
  parseTableSeparator,
  parseUnorderedListItem,
} from "./parserUtils";

interface FinalizeBufferedBlockOptions<T> {
  createBlock: (id: number, value: T) => MarkdownBlock;
  id: number | null;
  isEmpty: (value: T) => boolean;
  pushBlock: (block: MarkdownBlock) => void;
  reset: () => void;
  value: T;
}

function finalizeBufferedBlock<T>({
  createBlock,
  id,
  isEmpty,
  pushBlock,
  reset,
  value,
}: FinalizeBufferedBlockOptions<T>): void {
  if (id === null || isEmpty(value)) {
    reset();
    return;
  }

  pushBlock(createBlock(id, value));
  reset();
}

export { blocksEqual, createParserState };

export function parseChunk(
  parser: ParserState,
  blocks: MarkdownBlock[],
  input: string,
  finalizeAtEnd: boolean,
): ParseResult {
  let nextBlocks = blocks;
  let blocksChanged = false;

  const pushBlock = (block: MarkdownBlock) => {
    nextBlocks = [...nextBlocks, block];
    blocksChanged = true;
  };

  const finalizeParagraph = () => {
    finalizeBufferedBlock({
      createBlock: (id, text: string) => ({
        id,
        type: "paragraph",
        text,
      }),
      id: parser.paragraphId,
      isEmpty: (text) => text.length === 0,
      pushBlock,
      reset: () => {
        parser.paragraphId = null;
        parser.paragraphText = "";
      },
      value: parser.paragraphText,
    });
  };

  const finalizeBlockquote = () => {
    finalizeBufferedBlock({
      createBlock: (id, text: string) => ({
        id,
        type: "blockquote",
        text,
      }),
      id: parser.blockquoteId,
      isEmpty: (text) => text.length === 0,
      pushBlock,
      reset: () => {
        parser.blockquoteId = null;
        parser.blockquoteText = "";
      },
      value: parser.blockquoteText,
    });
  };

  const finalizeUnorderedList = () => {
    finalizeBufferedBlock({
      createBlock: (id, items: string[]) => ({
        id,
        type: "unordered_list",
        items,
      }),
      id: parser.unorderedListId,
      isEmpty: (items) => items.length === 0,
      pushBlock,
      reset: () => {
        parser.unorderedListId = null;
        parser.unorderedListItems = [];
      },
      value: parser.unorderedListItems,
    });
  };

  const finalizeOrderedList = () => {
    finalizeBufferedBlock({
      createBlock: (id, items) => ({
        id,
        type: "ordered_list",
        items,
      }),
      id: parser.orderedListId,
      isEmpty: (items) => items.length === 0,
      pushBlock,
      reset: () => {
        parser.orderedListId = null;
        parser.orderedListItems = [];
      },
      value: parser.orderedListItems,
    });
  };

  const finalizeCode = () => {
    finalizeBufferedBlock({
      createBlock: (id, code: string) => ({
        id,
        type: "code",
        language: parser.codeLanguage,
        code,
      }),
      id: parser.codeId,
      isEmpty: () => false,
      pushBlock,
      reset: () => {
        parser.codeId = null;
        parser.codeLanguage = "";
        parser.codeText = "";
      },
      value: parser.codeText,
    });
  };

  const finalizeTable = () => {
    finalizeBufferedBlock({
      createBlock: (id) => ({
        id,
        type: "table",
        headers: parser.tableHeaders,
        alignments: parser.tableAlignments,
        rows: parser.tableRows,
      }),
      id: parser.tableId,
      isEmpty: () => parser.tableHeaders.length === 0,
      pushBlock,
      reset: () => {
        parser.tableId = null;
        parser.tableHeaders = [];
        parser.tableAlignments = [];
        parser.tableRows = [];
      },
      value: parser.tableHeaders,
    });
  };

  const finalizeAllOpenNonCode = () => {
    finalizeParagraph();
    finalizeBlockquote();
    finalizeUnorderedList();
    finalizeOrderedList();
    finalizeTable();
  };

  const processLine = (line: string) => {
    if (parser.mode === "code") {
      if (isClosingFence(line)) {
        finalizeCode();
        parser.mode = "normal";
        return;
      }

      parser.codeText = appendLine(parser.codeText, line);
      return;
    }

    const codeFenceLanguage = parseFenceLanguage(line);
    if (codeFenceLanguage !== null) {
      finalizeAllOpenNonCode();
      parser.mode = "code";
      parser.codeId = parser.nextId++;
      parser.codeLanguage = codeFenceLanguage;
      parser.codeText = "";
      return;
    }

    if (parser.tableId !== null) {
      const rowCells = parseTableRow(line);
      if (rowCells !== null) {
        parser.tableRows = [
          ...parser.tableRows,
          normalizeRowToColumnCount(rowCells, parser.tableHeaders.length),
        ];
        return;
      }

      finalizeTable();
    }

    const maybeHeader = parseHeaderLine(line);
    if (maybeHeader) {
      finalizeAllOpenNonCode();

      const headerId = parser.linePreviewId ?? parser.nextId++;
      pushBlock({
        id: headerId,
        type: "header",
        level: maybeHeader.level,
        text: maybeHeader.text,
      });
      return;
    }

    const maybeBlockquote = parseBlockquoteLine(line);
    if (maybeBlockquote !== null) {
      finalizeParagraph();
      finalizeUnorderedList();
      finalizeOrderedList();

      if (parser.blockquoteId === null) {
        parser.blockquoteId = parser.linePreviewId ?? parser.nextId++;
        parser.blockquoteText = maybeBlockquote;
        return;
      }

      parser.blockquoteText = appendLine(parser.blockquoteText, maybeBlockquote);
      return;
    }

    const maybeUnorderedListItem = parseUnorderedListItem(line);
    if (maybeUnorderedListItem !== null) {
      finalizeParagraph();
      finalizeBlockquote();
      finalizeOrderedList();

      if (parser.unorderedListId === null) {
        parser.unorderedListId = parser.linePreviewId ?? parser.nextId++;
        parser.unorderedListItems = [maybeUnorderedListItem];
        return;
      }

      parser.unorderedListItems = [
        ...parser.unorderedListItems,
        maybeUnorderedListItem,
      ];
      return;
    }

    const maybeOrderedListItem = parseOrderedListItem(line);
    if (maybeOrderedListItem !== null) {
      finalizeParagraph();
      finalizeBlockquote();
      finalizeUnorderedList();

      if (parser.orderedListId === null) {
        parser.orderedListId = parser.linePreviewId ?? parser.nextId++;
        parser.orderedListItems = [maybeOrderedListItem];
        return;
      }

      parser.orderedListItems = [...parser.orderedListItems, maybeOrderedListItem];
      return;
    }

    const maybeSeparator = parseTableSeparator(line);
    if (maybeSeparator !== null && parser.paragraphId !== null) {
      if (!parser.paragraphText.includes("\n")) {
        const headerCells = parseTableRow(parser.paragraphText);
        if (headerCells !== null && headerCells.length === maybeSeparator.length) {
          parser.tableId = parser.paragraphId;
          parser.tableHeaders = headerCells;
          parser.tableAlignments = maybeSeparator;
          parser.tableRows = [];
          parser.paragraphId = null;
          parser.paragraphText = "";
          return;
        }
      }
    }

    if (line.trim().length === 0) {
      finalizeAllOpenNonCode();
      return;
    }

    finalizeBlockquote();
    finalizeUnorderedList();
    finalizeOrderedList();

    if (parser.paragraphId === null) {
      parser.paragraphId = parser.linePreviewId ?? parser.nextId++;
      parser.paragraphText = line;
      return;
    }

    parser.paragraphText = appendLine(parser.paragraphText, line);
  };

  for (const char of input) {
    if (char === "\n") {
      processLine(parser.lineBuffer);
      parser.lineBuffer = "";
      parser.linePreviewId = null;
      continue;
    }

    parser.lineBuffer += char;
  }

  if (finalizeAtEnd) {
    if (parser.lineBuffer.length > 0) {
      processLine(parser.lineBuffer);
      parser.lineBuffer = "";
      parser.linePreviewId = null;
    }

    if (parser.mode === "code") {
      finalizeCode();
      parser.mode = "normal";
    } else {
      finalizeAllOpenNonCode();
    }
  }

  return {
    nextBlocks,
    blocksChanged,
    activeBlock: deriveActiveBlock(parser),
  };
}
