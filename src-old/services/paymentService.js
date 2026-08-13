import apiClient from "./apiClient";

export const getPayments = async (params = {}) => {
  const { data } = await apiClient.get("/payments", { params });
  return data;
};

export const getPayment = async (visitId) => {
  const { data } = await apiClient.get(`/visits/${visitId}/payment`);
  return data;
};

export const getPaymentById = async (paymentId) => {
  const { data } = await apiClient.get(`/payments/${paymentId}`);
  return data;
};

export const createPayment = async (visitId, payload) => {
  const { data } = await apiClient.post(`/visits/${visitId}/payment`, payload);
  return data;
};

export const generatePaymentDraft = async (visitId) => {
  const { data } = await apiClient.post(`/visits/${visitId}/payment/generate`);
  return data;
};

export const savePreparationPaymentPreferences = async (visitId, payload) => {
  const { data } = await apiClient.post(`/visits/${visitId}/payment/preferences`, payload);
  return data;
};

export const updatePayment = async (id, payload) => {
  const { data } = await apiClient.put(`/payments/${id}`, payload);
  return data;
};

export const addPaymentTransaction = async (paymentId, payload) => {
  const { data } = await apiClient.post(
    `/payments/${paymentId}/transactions`,
    payload,
  );
  return data;
};

export const createInvoiceDraft = async (payload) => {
  const { data } = await apiClient.post("/payments", payload);
  return data;
};

export const voidPayment = async (paymentId) => {
  const { data } = await apiClient.delete(`/payments/${paymentId}`);
  return data;
};
