import apiClient from "./apiClient";

export const listFollowUpTasks = async (params = {}) => {
  const { data } = await apiClient.get("/follow-up-tasks", { params });
  return data;
};

export const getFollowUpSummary = async () => {
  const { data } = await apiClient.get("/follow-up-tasks/summary");
  return data;
};

export const getFollowUpTask = async (taskId) => {
  const { data } = await apiClient.get(`/follow-up-tasks/${taskId}`);
  return data;
};

export const startFollowUpTask = async (taskId) => {
  const { data } = await apiClient.post(`/follow-up-tasks/${taskId}/start`);
  return data;
};

export const listFollowUpAssignableStaff = async () => {
  const { data } = await apiClient.get("/follow-up-tasks/assignable-staff");
  return Array.isArray(data) ? data : [];
};

export const assignFollowUpTask = async (taskId, assignedTo) => {
  const { data } = await apiClient.post(`/follow-up-tasks/${taskId}/assign`, {
    assigned_to: assignedTo,
  });
  return data;
};

export const submitFollowUpOutcome = async (taskId, payload) => {
  const { data } = await apiClient.post(`/follow-up-tasks/${taskId}/outcome`, payload);
  return data;
};

export const completeFollowUpTask = async (taskId) => {
  const { data } = await apiClient.post(`/follow-up-tasks/${taskId}/complete`);
  return data;
};

export const rescheduleFollowUpTask = async (taskId, dueDate) => {
  const { data } = await apiClient.post(`/follow-up-tasks/${taskId}/reschedule`, {
    due_date: dueDate,
  });
  return data;
};

export const skipFollowUpTask = async (taskId) => {
  const { data } = await apiClient.post(`/follow-up-tasks/${taskId}/skip`);
  return data;
};
