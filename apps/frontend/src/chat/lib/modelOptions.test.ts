import { describe, expect, it } from "vitest";

import type { ChatModelOption } from "../../types";
import {
  indexModelOptions,
  resolveEffortForModel,
  resolveModelOption,
} from "./modelOptions";

const MODELS: ChatModelOption[] = [
  {
    id: "gpt-4.1",
    efforts: [],
    defaultEffort: null,
  },
  {
    id: "gpt-5.4",
    efforts: ["minimal", "low", "medium", "high", "xhigh"],
    defaultEffort: "medium",
  },
];

describe("modelOptions", () => {
  it("resolves the selected model option when present", () => {
    const modelsById = indexModelOptions(MODELS);

    expect(resolveModelOption(modelsById, "gpt-5.4", "gpt-4.1", MODELS)).toEqual(
      MODELS[1],
    );
  });

  it("falls back to the default model option", () => {
    const modelsById = indexModelOptions(MODELS);

    expect(resolveModelOption(modelsById, null, "gpt-4.1", MODELS)).toEqual(
      MODELS[0],
    );
  });

  it("clears effort for non-reasoning models", () => {
    expect(resolveEffortForModel(MODELS[0], "high")).toBeNull();
  });

  it("preserves effort when the next model still supports it", () => {
    expect(resolveEffortForModel(MODELS[1], "high")).toBe("high");
  });

  it("resets effort to the model default when the current effort is unsupported", () => {
    expect(resolveEffortForModel(MODELS[1], "none")).toBe("medium");
  });
});
