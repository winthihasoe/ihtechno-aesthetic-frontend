import apiClient from "./apiClient";

/** Clinic-wide encounter (consultation) register across all patients. */
export const getEncounters = async (params = {}) => {
  const { data } = await apiClient.get("/encounters", { params });
  return Array.isArray(data) ? data : (data?.data ?? []);
};

/** Clinic-wide prescription register across all patients. */
export const getPrescriptionsRegister = async (params = {}) => {
  const { data } = await apiClient.get("/prescriptions", { params });
  return Array.isArray(data) ? data : (data?.data ?? []);
};
