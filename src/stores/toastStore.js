import { create } from "zustand";

const useToastStore = create((set) => ({
  queue: [],
  pushToast: ({ message, severity = "success" }) =>
    set((state) => ({
      queue: [
        ...state.queue,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          message,
          severity,
        },
      ],
    })),
  shiftToast: () =>
    set((state) => ({
      queue: state.queue.slice(1),
    })),
}));

export default useToastStore;
