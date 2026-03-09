import type {
  HeaderBlock,
  MarkdownBlock,
  OrderedListItem,
  ParseResult,
  ParserState,
} from "./types";

export function createParserState(): ParserState {
  return {
    nextId: 1,
    mode: "normal",
    lineBuffer: "",
    linePreviewId: null,
    paragraphId: null,
    paragraphText: "",
    blockquoteId: null,
    blockquoteText: "",
    unorderedListId: null,
    unorderedListItems: [],
    orderedListId: null,
    orderedListItems: [],
    codeId: null,
    codeLanguage: "",
    codeText: "",
  };
}

function appendLine(existingText: string, line: string): string {
  return existingText.length === 0 ? line : `${existingText}\n${line}`;
}

function parseHeaderLine(
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

function parseFenceLanguage(line: string): string | null {
  const trimmedStart = line.trimStart();
  if (!trimmedStart.startsWith("```")) {
    return null;
  }

  return trimmedStart.slice(3).trim();
}

function isClosingFence(line: string): boolean {
  return line.trim() === "```";
}

function parseBlockquoteLine(line: string): string | null {
  const blockquoteMatch = /^\s{0,3}>\s?(.*)$/.exec(line);
  if (!blockquoteMatch) {
    return null;
  }

  return blockquoteMatch[1];
}

function parseUnorderedListItem(line: string): string | null {
  const unorderedMatch = /^\s{0,3}-\s+(.*)$/.exec(line);
  if (!unorderedMatch) {
    return null;
  }

  return unorderedMatch[1];
}

function parseOrderedListItem(line: string): OrderedListItem | null {
  const orderedMatch = /^\s{0,3}(\d+)\.\s+(.*)$/.exec(line);
  if (!orderedMatch) {
    return null;
  }

  return {
    index: Number(orderedMatch[1]),
    text: orderedMatch[2],
  };
}

function deriveActiveBlock(parser: ParserState): MarkdownBlock | null {
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
    if (parser.paragraphId === null || parser.paragraphText.length === 0) {
      parser.paragraphId = null;
      parser.paragraphText = "";
      return;
    }

    pushBlock({
      id: parser.paragraphId,
      type: "paragraph",
      text: parser.paragraphText,
    });
    parser.paragraphId = null;
    parser.paragraphText = "";
  };

  const finalizeBlockquote = () => {
    if (parser.blockquoteId === null || parser.blockquoteText.length === 0) {
      parser.blockquoteId = null;
      parser.blockquoteText = "";
      return;
    }

    pushBlock({
      id: parser.blockquoteId,
      type: "blockquote",
      text: parser.blockquoteText,
    });
    parser.blockquoteId = null;
    parser.blockquoteText = "";
  };

  const finalizeUnorderedList = () => {
    if (parser.unorderedListId === null || parser.unorderedListItems.length === 0) {
      parser.unorderedListId = null;
      parser.unorderedListItems = [];
      return;
    }

    pushBlock({
      id: parser.unorderedListId,
      type: "unordered_list",
      items: parser.unorderedListItems,
    });
    parser.unorderedListId = null;
    parser.unorderedListItems = [];
  };

  const finalizeOrderedList = () => {
    if (parser.orderedListId === null || parser.orderedListItems.length === 0) {
      parser.orderedListId = null;
      parser.orderedListItems = [];
      return;
    }

    pushBlock({
      id: parser.orderedListId,
      type: "ordered_list",
      items: parser.orderedListItems,
    });
    parser.orderedListId = null;
    parser.orderedListItems = [];
  };

  const finalizeCode = () => {
    if (parser.codeId === null) {
      parser.codeLanguage = "";
      parser.codeText = "";
      return;
    }

    pushBlock({
      id: parser.codeId,
      type: "code",
      language: parser.codeLanguage,
      code: parser.codeText,
    });
    parser.codeId = null;
    parser.codeLanguage = "";
    parser.codeText = "";
  };

  const finalizeAllOpenNonCode = () => {
    finalizeParagraph();
    finalizeBlockquote();
    finalizeUnorderedList();
    finalizeOrderedList();
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

function orderedListItemsEqual(a: OrderedListItem[], b: OrderedListItem[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i].index !== b[i].index || a[i].text !== b[i].text) {
      return false;
    }
  }

  return true;
}

function stringArrayEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
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

  return false;
}
