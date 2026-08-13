import apiClient from "./apiClient";

export const getPatientStoreCredit = (patientId) =>
  apiClient.get(`/patients/${patientId}/store-credit`).then((r) => r.data);

export const adjustPatientStoreCredit = (patientId, payload) =>
  apiClient.post(`/patients/${patientId}/store-credit/adjust`, payload).then((r) => r.data);

export const applyStoreCreditToPayment = (paymentId, amount) =>
  apiClient
    .post(`/payments/${paymentId}/apply-store-credit`, { amount })
    .then((r) => r.data);
