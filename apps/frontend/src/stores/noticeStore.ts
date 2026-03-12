import { create } from "zustand";

interface NoticeState {
  notice: string;
  showNotice: (message: string) => void;
  clearNotice: () => void;
}

let autoClearTimer: ReturnType<typeof setTimeout> | undefined;

export const useNoticeStore = create<NoticeState>((set) => ({
  notice: "",
  showNotice: (message: string) => {
    if (autoClearTimer !== undefined) {
      clearTimeout(autoClearTimer);
    }

    set({ notice: message });

    autoClearTimer = setTimeout(() => {
      set({ notice: "" });
      autoClearTimer = undefined;
    }, 2800);
  },
  clearNotice: () => {
    if (autoClearTimer !== undefined) {
      clearTimeout(autoClearTimer);
      autoClearTimer = undefined;
    }

    set({ notice: "" });
  },
}));
