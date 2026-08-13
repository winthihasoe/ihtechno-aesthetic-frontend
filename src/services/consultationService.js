import apiClient from "./apiClient";

export const getConsultation = async (visitId) => {
  const { data } = await apiClient.get(`/visits/${visitId}/consultation`);
  return data;
};

export const createConsultation = async (visitId, payload) => {
  const { data } = await apiClient.post(
    `/visits/${visitId}/consultation`,
    payload,
  );
  return data;
};

export const updateConsultation = async (id, payload) => {
  const { data } = await apiClient.put(`/consultations/${id}`, payload);
  return data;
};
