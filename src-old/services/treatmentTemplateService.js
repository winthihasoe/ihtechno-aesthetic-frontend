import apiClient from "./apiClient";

export const getTreatmentCategories = () =>
  apiClient.get("/treatment-categories").then((r) => r.data);

export const createTreatmentCategory = (data) =>
  apiClient.post("/treatment-categories", data).then((r) => r.data);

export const updateTreatmentCategory = (id, data) =>
  apiClient.put(`/treatment-categories/${id}`, data).then((r) => r.data);

export const deleteTreatmentCategory = (id) =>
  apiClient.delete(`/treatment-categories/${id}`).then((r) => r.data);

export const getTreatmentTemplates = (params = {}) =>
  apiClient.get("/treatment-templates", { params }).then((r) => r.data);

export const getActiveTreatmentTemplates = () =>
  apiClient.get("/treatment-templates/active").then((r) => r.data);

export const getTreatmentTemplate = (id) =>
  apiClient.get(`/treatment-templates/${id}`).then((r) => r.data);

export const createTreatmentTemplate = (data) =>
  apiClient.post("/treatment-templates", data).then((r) => r.data);

export const updateTreatmentTemplate = (id, data) =>
  apiClient.put(`/treatment-templates/${id}`, data).then((r) => r.data);

export const deleteTreatmentTemplate = (id) =>
  apiClient.delete(`/treatment-templates/${id}`).then((r) => r.data);

export const getTreatmentTemplateRequiredForms = (id) =>
  apiClient.get(`/treatment-templates/${id}/required-forms`).then((r) => r.data);

export const syncTreatmentTemplateRequiredForms = (id, payload) =>
  apiClient.put(`/treatment-templates/${id}/required-forms`, payload).then((r) => r.data);

export const getTreatmentTemplateCost = (id) =>
  apiClient.get(`/treatment-templates/${id}/cost`).then((r) => r.data);
