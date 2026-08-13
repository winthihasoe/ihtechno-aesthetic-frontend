import apiClient from "./apiClient";

export const getVisits = async (params = {}) => {
  const { data } = await apiClient.get("/visits", { params });
  return data;
};

export const getVisit = async (id) => {
  const { data } = await apiClient.get(`/visits/${id}`);
  return data;
};

export const createVisit = async (payload) => {
  const { data } = await apiClient.post("/visits", payload);
  return data;
};

export const updateVisit = async (id, payload) => {
  const { data } = await apiClient.put(`/visits/${id}`, payload);
  return data;
};

export const startConsultation = async (id, payload = {}) => {
  const { data } = await apiClient.post(
    `/visits/${id}/start-consultation`,
    payload,
  );
  return data;
};

export const sendToPreparation = async (id, payload = {}) => {
  const { data } = await apiClient.post(
    `/visits/${id}/send-to-preparation`,
    payload,
  );
  return data;
};

export const goToPreparation = async (id, payload = {}) => {
  const { data } = await apiClient.post(`/visits/${id}/go-to-preparation`, payload);
  return data;
};

export const getPreparationChecklist = async (id) => {
  const { data } = await apiClient.get(`/visits/${id}/preparation-checklist`);
  return data;
};

export const sendToTreatment = async (id, payload = {}) => {
  const { data } = await apiClient.post(
    `/visits/${id}/send-to-treatment`,
    payload,
  );
  return data;
};

export const checkoutFromConsultation = async (id, payload = {}) => {
  const { data } = await apiClient.post(
    `/visits/${id}/checkout-from-consultation`,
    payload,
  );
  return data;
};

export const completeTreatment = async (id, payload = {}) => {
  const { data } = await apiClient.post(`/visits/${id}/complete-treatment`, payload);
  return data;
};

export const completePayment = async (id) => {
  const { data } = await apiClient.post(`/visits/${id}/complete-payment`);
  return data;
};

export const getLiveboardAssignableStaff = async () => {
  const { data } = await apiClient.get("/liveboard/assignable-staff");
  return data;
};

export const assignVisitCareTeam = async (id, payload) => {
  const { data } = await apiClient.post(`/visits/${id}/assignments`, payload);
  return data;
};

export const assignWaitingDoctor = async (id, payload) => {
  const { data } = await apiClient.post(`/visits/${id}/assign-waiting-doctor`, payload);
  return data;
};

export const handoverCheckIn = async (id, payload) => {
  const { data } = await apiClient.post(`/visits/${id}/handover-check-in`, payload);
  return data;
};

export const acceptCheckInHandover = async (id) => {
  const { data } = await apiClient.post(`/visits/${id}/handover-check-in/accept`);
  return data;
};

export const handoverTreatmentDoctor = async (id, payload) => {
  const { data } = await apiClient.post(
    `/visits/${id}/handover-treatment-doctor`,
    payload,
  );
  return data;
};

export const acceptTreatmentDoctorHandover = async (id) => {
  const { data } = await apiClient.post(
    `/visits/${id}/handover-treatment-doctor/accept`,
  );
  return data;
};
