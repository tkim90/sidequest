import { create } from "zustand";

import { fetchChatModelConfig } from "../chat/api/streamChat";
import { isAbortError } from "../chat/lib/errors";
import { indexModelOptions } from "../chat/lib/modelOptions";
import { useNoticeStore } from "./noticeStore";
import { getErrorMessage } from "../chat/lib/errors";
import type { ChatModelOption } from "../types";

interface ModelState {
  models: ChatModelOption[];
  modelsById: Record<string, ChatModelOption>;
  defaultModel: string | null;
  isLoaded: boolean;
  fetchModels: (signal?: AbortSignal) => Promise<void>;
}

export const useModelStore = create<ModelState>((set) => ({
  models: [],
  modelsById: {},
  defaultModel: null,
  isLoaded: false,
  fetchModels: async (signal?: AbortSignal) => {
    try {
      const config = await fetchChatModelConfig(signal);
      const fallbackModel = config.defaultModel ?? config.models[0]?.id ?? null;

      set({
        models: config.models,
        modelsById: indexModelOptions(config.models),
        defaultModel: fallbackModel,
        isLoaded: true,
      });
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        useNoticeStore.getState().showNotice(getErrorMessage(error));
      }
    }
  },
}));
