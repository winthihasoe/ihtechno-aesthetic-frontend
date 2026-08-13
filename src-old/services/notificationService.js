import apiClient from "./apiClient";

export const getNotifications = async (params = {}) => {
  const { data } = await apiClient.get("/notifications", { params });
  return data;
};

export const markNotificationRead = async (id) => {
  const { data } = await apiClient.post(`/notifications/${id}/read`);
  return data;
};

export const markAllNotificationsRead = async () => {
  const { data } = await apiClient.post("/notifications/read-all");
  return data;
};
