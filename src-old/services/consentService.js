import apiClient from "./apiClient";

export const getVisitConsents = async (visitId) => {
  const { data } = await apiClient.get(`/visits/${visitId}/consents`);
  return data;
};

export const getGfeStatus = async (visitId) => {
  const { data } = await apiClient.get(`/visits/${visitId}/consents/gfe-status`);
  return data;
};

export const markGfeComplete = async (visitId, payload = {}) => {
  const { data } = await apiClient.post(
    `/visits/${visitId}/consents/gfe-complete`,
    payload,
  );
  return data;
};

export const updateConsent = async (consentId, payload) => {
  const { data } = await apiClient.patch(`/consents/${consentId}`, payload);
  return data;
};
