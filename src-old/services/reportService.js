import apiClient from "./apiClient";

export const getOperationalSummary = async (params = {}) => {
  const { data } = await apiClient.get("/reports/operational/summary", { params });
  return data;
};

export const getTreatmentTrend = async (params = {}) => {
  const { data } = await apiClient.get("/reports/operational/treatment-trend", { params });
  return data;
};

export const getTreatmentPopularity = async (params = {}) => {
  const { data } = await apiClient.get("/reports/operational/treatment-popularity", { params });
  return data;
};

export const getPackagePurchases = async (params = {}) => {
  const { data } = await apiClient.get("/reports/operational/package-purchases", { params });
  return data;
};

export const getMonthlyRankings = async (params = {}) => {
  const { data } = await apiClient.get("/reports/operational/monthly-rankings", { params });
  return data;
};

export const getAppointmentReport = async (params = {}) => {
  const { data } = await apiClient.get("/reports/operational/appointments", { params });
  return data;
};

export const getTreatmentMarginsReport = async () => {
  const { data } = await apiClient.get("/reports/treatment-margins");
  return data;
};

export const getPackageMarginsReport = async () => {
  const { data } = await apiClient.get("/reports/package-margins");
  return data;
};
