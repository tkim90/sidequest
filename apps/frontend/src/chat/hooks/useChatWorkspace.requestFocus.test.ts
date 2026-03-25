import { describe, expect, it } from "vitest";

import type { BranchFocus, ChatMessage } from "../../types";
import {
  buildRequestBranchFocus,
  resolveLatestUserQuery,
} from "./useChatWorkspace";

describe("request branch focus helpers", () => {
  it("uses the just-submitted fork prompt as the latest query for a fresh send", () => {
    const branchFocus: BranchFocus = {
      selectedText: "Claude Shannon",
      parentWindowTitle: "Chat 1",
      parentMessageRole: "assistant",
    };

    expect(buildRequestBranchFocus(branchFocus, "Who is this?")).toEqual({
      ...branchFocus,
      latestUserQuery: "Who is this?",
    });
  });

  it("uses the last user message as the latest query for branched retries", () => {
    const requestMessages: ChatMessage[] = [
      { role: "user", content: "Tell me about information theory." },
      { role: "assistant", content: "It studies storage and communication." },
      { role: "user", content: "Who is this?" },
    ];

    expect(resolveLatestUserQuery(requestMessages)).toBe("Who is this?");
  });
});
