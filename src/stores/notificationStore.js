import { create } from "zustand";

const useNotificationStore = create((set, get) => ({
  notifications: [],

  addNotification: (message) =>
    set((state) => ({
      notifications: [
        {
          id: Date.now(),
          message,
          time: new Date().toISOString(),
          read: false,
        },
        ...state.notifications,
      ],
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),

  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));

export default useNotificationStore;
