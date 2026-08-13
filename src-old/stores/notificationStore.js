import { create } from "zustand";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  hydratedFromServer: false,

  addNotification: (messageOrPayload) =>
    set((state) => {
      const payload =
        typeof messageOrPayload === "string"
          ? { message: messageOrPayload }
          : messageOrPayload;
      return {
        notifications: [
          {
            id: payload.id ?? `local-${Date.now()}`,
            message: payload.message ?? payload.title ?? "",
            title: payload.title,
            body: payload.body,
            time: payload.time ?? payload.created_at ?? new Date().toISOString(),
            read: payload.read ?? false,
            source: payload.source ?? "local",
          },
          ...state.notifications,
        ],
      };
    }),

  hydrateNotifications: (rows) =>
    set((state) => {
      const localOnly = state.notifications.filter((n) => n.source === "local");
      const serverRows = (Array.isArray(rows) ? rows : []).map((row) => ({
        id: row.id,
        message: row.title,
        title: row.title,
        body: row.body,
        time: row.created_at,
        read: Boolean(row.read_at),
        source: "server",
        type: row.type,
        payload: row.payload,
      }));
      return {
        notifications: [...serverRows, ...localOnly],
        hydratedFromServer: true,
      };
    }),

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
