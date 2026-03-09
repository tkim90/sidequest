import type { InlineNode } from "./types";

function appendTextNode(nodes: InlineNode[], text: string): void {
  if (text.length === 0) {
    return;
  }

  const lastNode = nodes.at(-1);
  if (lastNode && lastNode.type === "text") {
    lastNode.text += text;
    return;
  }

  nodes.push({ type: "text", text });
}

export function parseInlineMarkdown(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    if (text[cursor] === "[") {
      const closeLabelBracket = text.indexOf("]", cursor + 1);
      if (
        closeLabelBracket !== -1 &&
        text[closeLabelBracket + 1] === "("
      ) {
        const closeUrlParen = text.indexOf(")", closeLabelBracket + 2);
        if (closeUrlParen !== -1) {
          const label = text.slice(cursor + 1, closeLabelBracket);
          const href = text.slice(closeLabelBracket + 2, closeUrlParen).trim();
          if (href.length > 0) {
            nodes.push({
              type: "link",
              href,
              children: parseInlineMarkdown(label),
            });
            cursor = closeUrlParen + 1;
            continue;
          }
        }
      }
    }

    if (text[cursor] === "`") {
      const closeTick = text.indexOf("`", cursor + 1);
      if (closeTick !== -1) {
        nodes.push({
          type: "code",
          text: text.slice(cursor + 1, closeTick),
        });
        cursor = closeTick + 1;
        continue;
      }

      appendTextNode(nodes, text[cursor]);
      cursor += 1;
      continue;
    }

    if (text.startsWith("**", cursor)) {
      const closeStrong = text.indexOf("**", cursor + 2);
      if (closeStrong !== -1) {
        const strongBody = text.slice(cursor + 2, closeStrong);
        if (strongBody.length > 0) {
          nodes.push({
            type: "strong",
            children: parseInlineMarkdown(strongBody),
          });
          cursor = closeStrong + 2;
          continue;
        }
      }

      appendTextNode(nodes, "**");
      cursor += 2;
      continue;
    }

    if (text.startsWith("~~", cursor)) {
      const closeStrike = text.indexOf("~~", cursor + 2);
      if (closeStrike !== -1) {
        const strikeBody = text.slice(cursor + 2, closeStrike);
        if (strikeBody.length > 0) {
          nodes.push({
            type: "strike",
            children: parseInlineMarkdown(strikeBody),
          });
          cursor = closeStrike + 2;
          continue;
        }
      }

      appendTextNode(nodes, "~~");
      cursor += 2;
      continue;
    }

    if (text[cursor] === "*") {
      const closeEmphasis = text.indexOf("*", cursor + 1);
      if (closeEmphasis !== -1) {
        const emphasisBody = text.slice(cursor + 1, closeEmphasis);
        if (emphasisBody.length > 0) {
          nodes.push({
            type: "em",
            children: parseInlineMarkdown(emphasisBody),
          });
          cursor = closeEmphasis + 1;
          continue;
        }
      }

      appendTextNode(nodes, "*");
      cursor += 1;
      continue;
    }

    appendTextNode(nodes, text[cursor]);
    cursor += 1;
  }

  return nodes;
}
