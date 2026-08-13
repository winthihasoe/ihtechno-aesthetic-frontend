import apiClient from "./apiClient";

export const getAppointments = async (params = {}) => {
  const { data } = await apiClient.get("/appointments", { params });
  return data;
};

export const getAssignableAppointmentDoctors = async () => {
  const { data } = await apiClient.get("/appointments/assignable-doctors");
  return data;
};

export const getAppointment = async (id) => {
  const { data } = await apiClient.get(`/appointments/${id}`);
  return data;
};

export const createAppointment = async (payload) => {
  const { data } = await apiClient.post("/appointments", payload);
  return data;
};

export const updateAppointment = async (id, payload) => {
  const { data } = await apiClient.put(`/appointments/${id}`, payload);
  return data;
};

export const confirmAppointment = async (id) => {
  const { data } = await apiClient.post(`/appointments/${id}/confirm`);
  return data;
};

export const cancelAppointment = async (id) => {
  const { data } = await apiClient.post(`/appointments/${id}/cancel`);
  return data;
};

export const completeAppointment = async (id) => {
  const { data } = await apiClient.post(`/appointments/${id}/complete`);
  return data;
};

export const checkInAppointment = async (id) => {
  const { data } = await apiClient.post(`/appointments/${id}/check-in`);
  return data;
};
