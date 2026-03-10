export interface SelectionState {
  parentWindowId: string;
  parentMessageId: string;
  selectedText: string;
  startOffset?: number;
  endOffset?: number;
  x: number;
  y: number;
  windowLocalY: number;
}

export interface ClosePrompt {
  confirmLabel: string;
  eyebrow: string;
  title: string;
  windowIds: string[];
  windowTitles: string[];
}

export interface WindowScrollState {
  scrollTop: number | null;
  shouldAutoScroll: boolean;
}

export interface ConnectorPath {
  id: string;
  path: string;
}
