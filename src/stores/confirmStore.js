import { create } from "zustand";

const useConfirmStore = create((set, get) => ({
  dialog: {
    open: false,
    title: "Confirm Action",
    message: "Are you sure you want to continue?",
    confirmText: "Confirm",
    cancelText: "Cancel",
  },
  resolver: null,
  askConfirm: (options = {}) =>
    new Promise((resolve) => {
      set({
        dialog: {
          open: true,
          title: options.title || "Confirm Action",
          message: options.message || "Are you sure you want to continue?",
          confirmText: options.confirmText || "Confirm",
          cancelText: options.cancelText || "Cancel",
        },
        resolver: resolve,
      });
    }),
  confirm: () => {
    const { resolver } = get();
    if (resolver) resolver(true);
    set((state) => ({
      ...state,
      dialog: { ...state.dialog, open: false },
      resolver: null,
    }));
  },
  cancel: () => {
    const { resolver } = get();
    if (resolver) resolver(false);
    set((state) => ({
      ...state,
      dialog: { ...state.dialog, open: false },
      resolver: null,
    }));
  },
}));

export default useConfirmStore;
