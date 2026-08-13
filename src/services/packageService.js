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
