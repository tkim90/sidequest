import type { ChatModelOption, ReasoningEffort } from "../../types";

export function indexModelOptions(
  models: ChatModelOption[],
): Record<string, ChatModelOption> {
  return Object.fromEntries(
    models.map((model) => [model.id, model]),
  );
}

export function resolveModelOption(
  modelsById: Record<string, ChatModelOption>,
  selectedModel: string | null,
  defaultModel: string | null,
  models: ChatModelOption[],
): ChatModelOption | null {
  if (selectedModel && modelsById[selectedModel]) {
    return modelsById[selectedModel];
  }

  if (defaultModel && modelsById[defaultModel]) {
    return modelsById[defaultModel];
  }

  return models[0] ?? null;
}

export function resolveEffortForModel(
  model: ChatModelOption | null,
  currentEffort: ReasoningEffort | null,
): ReasoningEffort | null {
  if (!model || model.efforts.length === 0) {
    return null;
  }

  if (currentEffort && model.efforts.includes(currentEffort)) {
    return currentEffort;
  }

  return model.defaultEffort ?? model.efforts[0] ?? null;
}
