import apiClient from "./apiClient";

export const getPackages = (params = {}) =>
  apiClient.get("/packages", { params }).then((r) => r.data);

export const getPackage = (id) =>
  apiClient.get(`/packages/${id}`).then((r) => r.data);

export const createPackage = (payload) =>
  apiClient.post("/packages", payload).then((r) => r.data);

export const updatePackage = (id, payload) =>
  apiClient.put(`/packages/${id}`, payload).then((r) => r.data);

export const deletePackage = (id) =>
  apiClient.delete(`/packages/${id}`).then((r) => r.data);

export const getPatientPackages = (patientId) =>
  apiClient.get(`/patients/${patientId}/packages`).then((r) => r.data);

export const assignPatientPackage = (patientId, payload) =>
  apiClient.post(`/patients/${patientId}/packages`, payload).then((r) => r.data);

export const getPatientPackageUsages = (patientPackageId) =>
  apiClient.get(`/patient-packages/${patientPackageId}/usages`).then((r) => r.data);

export const freezePatientPackage = (patientPackageId, payload = {}) =>
  apiClient.post(`/patient-packages/${patientPackageId}/freeze`, payload).then((r) => r.data);

export const unfreezePatientPackage = (patientPackageId) =>
  apiClient.post(`/patient-packages/${patientPackageId}/unfreeze`).then((r) => r.data);

export const refundPatientPackage = (patientPackageId) =>
  apiClient.post(`/patient-packages/${patientPackageId}/refund`).then((r) => r.data);

export const transferPatientPackage = (patientPackageId, payload) =>
  apiClient.post(`/patient-packages/${patientPackageId}/transfer`, payload).then((r) => r.data);

export const upgradePatientPackage = (patientPackageId, payload) =>
  apiClient.post(`/patient-packages/${patientPackageId}/upgrade`, payload).then((r) => r.data);

export const syncPatientPackageBeneficiaries = (patientPackageId, patientIds) =>
  apiClient
    .put(`/patient-packages/${patientPackageId}/beneficiaries`, {
      patient_ids: patientIds,
    })
    .then((r) => r.data);

export const getVisitPatientPackageItems = (visitId) =>
  apiClient.get(`/visits/${visitId}/patient-package-items`).then((r) => r.data);

export const postVisitPackageUsage = (visitId, payload) =>
  apiClient.post(`/visits/${visitId}/package-usages`, payload).then((r) => r.data);

export const getPackageCost = (id) =>
  apiClient.get(`/packages/${id}/cost`).then((r) => r.data);

export const getPackagesCostSummary = () =>
  apiClient.get("/packages/cost-summary").then((r) => r.data);

export const getTradeInPreview = (patientPackageId, params = {}) =>
  apiClient
    .get(`/patient-packages/${patientPackageId}/trade-in/preview`, { params })
    .then((r) => r.data);

export const tradeInPatientPackage = (patientPackageId, payload) =>
  apiClient.post(`/patient-packages/${patientPackageId}/trade-in`, payload).then((r) => r.data);

export const cancelPatientPackage = (patientPackageId, payload) =>
  apiClient.post(`/patient-packages/${patientPackageId}/cancel`, payload).then((r) => r.data);

export const getCustomerPackageList = (params = {}) =>
  apiClient.get("/patient-packages", { params }).then((r) => r.data);

export const downloadCustomerPackageListPdf = async (params = {}) => {
  const response = await apiClient.get("/patient-packages/export", {
    params,
    responseType: "blob",
  });
  const truncated = response.headers["x-export-truncated"] === "true";
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "customer-package-list.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { truncated };
};

const packageImportFormData = (file, extra = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });
  return formData;
};

export const previewPackageImport = async (file) =>
  (
    await apiClient.post(
      "/packages/import/preview",
      packageImportFormData(file),
      { headers: { "Content-Type": "multipart/form-data" } },
    )
  ).data;

export const importPackages = async (file, rowActions) =>
  (
    await apiClient.post(
      "/packages/import",
      packageImportFormData(file, {
        confirm: "1",
        row_actions: JSON.stringify(rowActions),
      }),
      { headers: { "Content-Type": "multipart/form-data" } },
    )
  ).data;

export const importLegacyPackageManual = async (payload) =>
  (await apiClient.post("/packages/import/manual", payload)).data;
