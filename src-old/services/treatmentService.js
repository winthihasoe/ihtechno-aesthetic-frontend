import apiClient from "./apiClient";

/** Latest single treatment (legacy / compact views). */
export const getTreatments = async (visitId) => {
  const { data } = await apiClient.get(`/visits/${visitId}/treatment`);
  return data;
};

/** All treatment sessions for a visit (Live Board editor). */
export const listVisitTreatments = async (visitId) => {
  const { data } = await apiClient.get(`/visits/${visitId}/treatments`);
  return Array.isArray(data) ? data : [];
};

export const createTreatment = async (visitId, payload) => {
  const { data } = await apiClient.post(
    `/visits/${visitId}/treatments`,
    payload,
  );
  return data;
};

export const updateTreatment = async (id, payload) => {
  const { data } = await apiClient.put(`/treatments/${id}`, payload);
  return data;
};

/** Mark one session done (FIFO + completed); Live Board Mark Done moves visit after all sessions are done. */
export const completeTreatmentSession = async (treatmentId) => {
  const { data } = await apiClient.post(
    `/treatments/${treatmentId}/complete-session`,
  );
  return data;
};

export const deleteTreatment = async (treatmentId) => {
  const { data } = await apiClient.delete(`/treatments/${treatmentId}`);
  return data;
};

export const addTreatmentItem = async (treatmentId, payload) => {
  const { data } = await apiClient.post(
    `/treatments/${treatmentId}/items`,
    payload,
  );
  return data;
};

export const updateTreatmentItem = async (itemId, payload) => {
  const { data } = await apiClient.put(`/treatment-items/${itemId}`, payload);
  return data;
};

export const deleteTreatmentItem = async (itemId) => {
  const { data } = await apiClient.delete(`/treatment-items/${itemId}`);
  return data;
};

export const listSessionProducts = async (treatmentId) => {
  const { data } = await apiClient.get(`/treatments/${treatmentId}/session-products`);
  return data;
};

export const addSessionProduct = async (treatmentId, payload) => {
  const { data } = await apiClient.post(
    `/treatments/${treatmentId}/session-products`,
    payload,
  );
  return data;
};

export const updateSessionProduct = async (lineId, payload) => {
  const { data } = await apiClient.put(
    `/treatment-session-products/${lineId}`,
    payload,
  );
  return data;
};

export const deleteSessionProduct = async (lineId) => {
  const { data } = await apiClient.delete(`/treatment-session-products/${lineId}`);
  return data;
};

export const listTreatmentMapPoints = async (treatmentId) => {
  const { data } = await apiClient.get(`/treatments/${treatmentId}/map-points`);
  return Array.isArray(data) ? data : [];
};

export const createTreatmentMapPoint = async (treatmentId, payload) => {
  const { data } = await apiClient.post(`/treatments/${treatmentId}/map-points`, payload);
  return data;
};

export const updateTreatmentMapPoint = async (mapPointId, payload) => {
  const { data } = await apiClient.put(`/treatment-map-points/${mapPointId}`, payload);
  return data;
};

export const deleteTreatmentMapPoint = async (mapPointId) => {
  const { data } = await apiClient.delete(`/treatment-map-points/${mapPointId}`);
  return data;
};

export const submitTreatmentApproval = async (treatmentId) => {
  const { data } = await apiClient.post(`/treatments/${treatmentId}/approvals/submit`);
  return data;
};

export const reviewTreatmentApproval = async (treatmentId, payload) => {
  const { data } = await apiClient.post(`/treatments/${treatmentId}/approvals/review`, payload);
  return data;
};

export const listPendingTreatmentApprovals = async () => {
  const { data } = await apiClient.get("/treatment-approvals/pending");
  return Array.isArray(data) ? data : [];
};
