import apiClient from "./apiClient";

export const getDepartments = async () => (await apiClient.get("/departments")).data;
export const createDepartment = async (payload) =>
  (await apiClient.post("/departments", payload)).data;
export const updateDepartment = async (id, payload) =>
  (await apiClient.put(`/departments/${id}`, payload)).data;
export const deleteDepartment = async (id) =>
  (await apiClient.delete(`/departments/${id}`)).data;

export const getStaffs = async () => (await apiClient.get("/staffs")).data;
export const getStaffProfile = async (id) =>
  (await apiClient.get(`/staffs/${id}`)).data;
export const createStaffProfile = async (payload) =>
  (await apiClient.post("/staffs", payload)).data;

export const getStaffProfileDocuments = async (staffId) =>
  (await apiClient.get(`/staffs/${staffId}/documents`)).data;

export const uploadStaffProfileDocument = async (staffId, documentType, file) => {
  const formData = new FormData();
  formData.append("document_type", documentType);
  formData.append("file", file);
  return (
    await apiClient.post(`/staffs/${staffId}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
};

export const deleteStaffProfileDocument = async (staffId, documentId) =>
  (await apiClient.delete(`/staffs/${staffId}/documents/${documentId}`)).data;
export const uploadStaffAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  return (
    await apiClient.post("/staffs/avatar-upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
};
export const deleteUploadedStaffAvatar = async (tempPath) =>
  (await apiClient.delete("/staffs/avatar-upload", { data: { temp_path: tempPath } })).data;
export const updateStaffProfile = async (id, payload) =>
  (await apiClient.put(`/staffs/${id}`, payload)).data;
export const resignStaff = async (id, payload) =>
  (await apiClient.put(`/staffs/${id}/resign`, payload)).data;

export const getAttendanceLogs = async (params) =>
  (await apiClient.get("/attendance", { params })).data;
export const checkInStaff = async (payload) =>
  (await apiClient.post("/attendance/check-in", payload)).data;
export const checkOutStaff = async (payload) =>
  (await apiClient.post("/attendance/check-out", payload)).data;
export const approveAttendanceLog = async (id) =>
  (await apiClient.put(`/attendance/${id}/approve`)).data;
export const correctAttendanceLog = async (id, payload) =>
  (await apiClient.post(`/attendance/${id}/corrections`, payload)).data;
export const addAttendanceAdjustment = async (id, payload) =>
  (await apiClient.post(`/attendance/${id}/adjustments`, payload)).data;
export const ingestAttendanceLog = async (payload) =>
  (await apiClient.post("/attendance/log", payload)).data;
export const getAttendanceRawLogs = async (params) =>
  (await apiClient.get("/attendance/raw-logs", { params })).data;
export const getAttendanceMappings = async (params) =>
  (await apiClient.get("/attendance/mappings", { params })).data;
export const createAttendanceMapping = async (payload) =>
  (await apiClient.post("/attendance/mappings", payload)).data;
export const updateAttendanceMapping = async (id, payload) =>
  (await apiClient.put(`/attendance/mappings/${id}`, payload)).data;

const attendanceImportFormData = (file, extra = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });
  return formData;
};

export const previewAttendanceImport = async (file, params = {}) =>
  (
    await apiClient.post(
      "/attendance/import/preview",
      attendanceImportFormData(file, params),
      { headers: { "Content-Type": "multipart/form-data" } },
    )
  ).data;

export const importAttendanceReport = async (file, params = {}) =>
  (
    await apiClient.post(
      "/attendance/import",
      attendanceImportFormData(file, { confirm: "1", ...params }),
      { headers: { "Content-Type": "multipart/form-data" } },
    )
  ).data;

export const getLeaves = async () => (await apiClient.get("/leaves")).data;
export const getLeaveRules = async () =>
  (await apiClient.get("/leave-rules")).data;
export const updateLeaveRules = async (payload) =>
  (await apiClient.put("/leave-rules", payload)).data;
export const createLeave = async (payload) =>
  (
    await apiClient.post("/leaves", payload, {
      headers:
        payload instanceof FormData
          ? { "Content-Type": "multipart/form-data" }
          : undefined,
    })
  ).data;
export const approveLeave = async (id, payload = {}) =>
  (await apiClient.put(`/leaves/${id}/approve`, payload)).data;
export const rejectLeave = async (id, payload) =>
  (await apiClient.put(`/leaves/${id}/reject`, payload)).data;
export const sendLeaveReply = async (id, payload) =>
  (await apiClient.put(`/leaves/${id}/reply`, payload)).data;
export const sendEmployeeLeaveReply = async (id, payload) =>
  (
    await apiClient.post(`/leaves/${id}/employee-reply`, payload, {
      headers:
        payload instanceof FormData
          ? { "Content-Type": "multipart/form-data" }
          : undefined,
    })
  ).data;
export const cancelLeave = async (id) =>
  (await apiClient.put(`/leaves/${id}/cancel`)).data;
export const appealLeave = async (id, payload) =>
  (await apiClient.put(`/leaves/${id}/appeal`, payload)).data;
export const resolveLeaveAppeal = async (id, payload) =>
  (await apiClient.put(`/leaves/${id}/appeal/resolve`, payload)).data;

export const getOvertimes = async (params) =>
  (await apiClient.get("/overtimes", { params })).data;
export const createOvertime = async (payload) =>
  (await apiClient.post("/overtimes", payload)).data;
export const backfillOvertimesFromAttendance = async () =>
  (await apiClient.post("/overtimes/backfill-from-attendance")).data;

export const getStaffSalaries = async () =>
  (await apiClient.get("/staff-salaries")).data;
export const createStaffSalary = async (payload) =>
  (await apiClient.post("/staff-salaries", payload)).data;
export const updateStaffSalary = async (id, payload) =>
  (await apiClient.put(`/staff-salaries/${id}`, payload)).data;
export const getStaffCompensationEntries = async (params) =>
  (await apiClient.get("/staff-compensation-entries", { params })).data;
export const createStaffCompensationEntry = async (payload) =>
  (await apiClient.post("/staff-compensation-entries", payload)).data;
export const updateStaffCompensationEntry = async (id, payload) =>
  (await apiClient.put(`/staff-compensation-entries/${id}`, payload)).data;
export const deleteStaffCompensationEntry = async (id) =>
  (await apiClient.delete(`/staff-compensation-entries/${id}`)).data;
export const getStaffTransportAllowancePolicies = async (params) =>
  (await apiClient.get("/staff-transport-allowance-policies", { params })).data;
export const createStaffTransportAllowancePolicy = async (payload) =>
  (await apiClient.post("/staff-transport-allowance-policies", payload)).data;
export const updateStaffTransportAllowancePolicy = async (id, payload) =>
  (await apiClient.put(`/staff-transport-allowance-policies/${id}`, payload)).data;
export const deleteStaffTransportAllowancePolicy = async (id) =>
  (await apiClient.delete(`/staff-transport-allowance-policies/${id}`)).data;
export const getPayrolls = async (params) =>
  (await apiClient.get("/payrolls", { params })).data;
export const getMyPayrolls = async (params) =>
  (await apiClient.get("/payrolls/my", { params })).data;
export const generatePayroll = async (payload) =>
  (await apiClient.post("/payrolls/generate", payload)).data;
export const finalizePayroll = async (id) =>
  (await apiClient.put(`/payrolls/${id}/finalize`)).data;

export const getCommissionRules = async () =>
  (await apiClient.get("/commission-rules")).data;
export const createCommissionRule = async (payload) =>
  (await apiClient.post("/commission-rules", payload)).data;

export const getStaffAssignments = async () =>
  (await apiClient.get("/staff-assignments")).data;
export const createStaffAssignment = async (payload) =>
  (await apiClient.post("/staff-assignments", payload)).data;

export const getHrTasks = async (params) =>
  (await apiClient.get("/hr-tasks", { params })).data;
export const createHrTask = async (payload) =>
  (await apiClient.post("/hr-tasks", payload)).data;
export const updateHrTask = async (id, payload) =>
  (await apiClient.put(`/hr-tasks/${id}`, payload)).data;
export const deleteHrTask = async (id) =>
  (await apiClient.delete(`/hr-tasks/${id}`)).data;

export const getStaffGrievances = async (params) =>
  (await apiClient.get("/staff-grievances", { params })).data;
export const getMyStaffGrievances = async (params) =>
  (await apiClient.get("/staff-grievances/my", { params })).data;
export const createStaffGrievance = async (payload) =>
  (await apiClient.post("/staff-grievances", payload)).data;
export const anonymousFollowUpStaffGrievance = async (payload) =>
  (await apiClient.post("/staff-grievances/anonymous-follow-up", payload)).data;
export const replyStaffGrievance = async (id, payload) =>
  (await apiClient.post(`/staff-grievances/${id}/reply`, payload)).data;
export const updateStaffGrievance = async (id, payload) =>
  (await apiClient.put(`/staff-grievances/${id}`, payload)).data;
export const getStaffProfileFieldConfigs = async () =>
  (await apiClient.get("/staff-profile-field-configs")).data;
export const updateStaffProfileFieldConfigs = async (payload) =>
  (await apiClient.put("/staff-profile-field-configs", payload)).data;
export const getStaffCustomFieldDefinitions = async () =>
  (await apiClient.get("/staff-custom-fields/definitions")).data;
export const createStaffCustomFieldDefinition = async (payload) =>
  (await apiClient.post("/staff-custom-fields/definitions", payload)).data;
export const updateStaffCustomFieldDefinition = async (id, payload) =>
  (await apiClient.put(`/staff-custom-fields/definitions/${id}`, payload)).data;
export const deactivateStaffCustomFieldDefinition = async (id) =>
  (await apiClient.delete(`/staff-custom-fields/definitions/${id}`)).data;
export const getStaffCustomFieldValues = async (staffId) =>
  (await apiClient.get(`/staffs/${staffId}/custom-fields`)).data;
export const saveStaffCustomFieldValues = async (staffId, payload) =>
  (await apiClient.put(`/staffs/${staffId}/custom-fields`, payload)).data;
export const getStaffSchedule = async (staffId) =>
  (await apiClient.get(`/staff-schedules/${staffId}`)).data;
export const saveStaffSchedule = async (staffId, payload) =>
  (await apiClient.put(`/staff-schedules/${staffId}`, payload)).data;
export const getPublicHolidays = async (params) =>
  (await apiClient.get("/public-holidays", { params })).data;
export const createPublicHoliday = async (payload) =>
  (await apiClient.post("/public-holidays", payload)).data;

export const getHrAttendanceReport = async (params) =>
  (await apiClient.get("/hr-reports/attendance", { params })).data;
export const getHrDailyStaffSnapshot = async (params) =>
  (await apiClient.get("/hr-reports/daily-staff-snapshot", { params })).data;
export const getHrLeaveOvertimeReport = async (params) =>
  (await apiClient.get("/hr-reports/leave-overtime", { params })).data;
export const getHrPayrollReport = async (params) =>
  (await apiClient.get("/hr-reports/payroll", { params })).data;
export const getHrPerformanceReport = async () =>
  (await apiClient.get("/hr-reports/performance")).data;
