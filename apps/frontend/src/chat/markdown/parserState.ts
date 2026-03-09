import type { ParserState } from "./types";

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
    tableId: null,
    tableHeaders: [],
    tableAlignments: [],
    tableRows: [],
  };
}
