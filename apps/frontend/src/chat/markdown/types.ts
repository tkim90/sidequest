export type HeaderBlock = {
  id: number;
  type: "header";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
};

export type ParagraphBlock = {
  id: number;
  type: "paragraph";
  text: string;
};

export type BlockquoteBlock = {
  id: number;
  type: "blockquote";
  text: string;
};

export type UnorderedListBlock = {
  id: number;
  type: "unordered_list";
  items: string[];
};

export type OrderedListItem = {
  index: number;
  text: string;
};

export type OrderedListBlock = {
  id: number;
  type: "ordered_list";
  items: OrderedListItem[];
};

export type CodeBlock = {
  id: number;
  type: "code";
  language: string;
  code: string;
};

export type MarkdownBlock =
  | HeaderBlock
  | ParagraphBlock
  | BlockquoteBlock
  | UnorderedListBlock
  | OrderedListBlock
  | CodeBlock;

export type InlineTextNode = {
  type: "text";
  text: string;
};

export type InlineCodeNode = {
  type: "code";
  text: string;
};

export type InlineStrongNode = {
  type: "strong";
  children: InlineNode[];
};

export type InlineEmphasisNode = {
  type: "em";
  children: InlineNode[];
};

export type InlineStrikethroughNode = {
  type: "strike";
  children: InlineNode[];
};

export type InlineLinkNode = {
  type: "link";
  href: string;
  children: InlineNode[];
};

export type InlineNode =
  | InlineTextNode
  | InlineCodeNode
  | InlineStrongNode
  | InlineEmphasisNode
  | InlineStrikethroughNode
  | InlineLinkNode;

export type ParserMode = "normal" | "code";

export type ParserState = {
  nextId: number;
  mode: ParserMode;
  lineBuffer: string;
  linePreviewId: number | null;
  paragraphId: number | null;
  paragraphText: string;
  blockquoteId: number | null;
  blockquoteText: string;
  unorderedListId: number | null;
  unorderedListItems: string[];
  orderedListId: number | null;
  orderedListItems: OrderedListItem[];
  codeId: number | null;
  codeLanguage: string;
  codeText: string;
};

export type ParseResult = {
  nextBlocks: MarkdownBlock[];
  blocksChanged: boolean;
  activeBlock: MarkdownBlock | null;
};
