export const MARITAL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Divorced",
  "Widowed",
  "Separated",
];

export const EMPLOYMENT_TYPE_OPTIONS = ["Full-time", "Part-time", "Contract"];

export { PROFILE_STATUS_OPTIONS } from "./staffProfileStatusHelpers";

export const HAS_KIDS_OPTIONS = [
  { value: "", label: "—" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const DOCUMENT_TYPE_CONFIG = {
  nrc_front: {
    label: "NRC (front)",
    accept: "image/*",
    multiple: false,
  },
  nrc_back: {
    label: "NRC (back)",
    accept: "image/*",
    multiple: false,
  },
  household_certificate: {
    label: "Household certificate",
    accept: "image/*",
    multiple: false,
  },
  qualification: {
    label: "Qualifications",
    accept: "image/*",
    multiple: true,
  },
  recommendation_letter: {
    label: "Recommendation letters",
    accept: "image/*,application/pdf",
    multiple: true,
  },
};

export const EMPTY_WORK_EXPERIENCE_ROW = () => ({
  company: "",
  position: "",
  period: "",
});

export const createEmptyStaffProfileForm = (overrides = {}) => ({
  userId: "",
  employeeCode: "",
  hireDate: new Date().toISOString().slice(0, 10),
  position: "",
  jobPositionId: "",
  jobDescriptionOverride: "",
  departmentId: "",
  reportingManagerId: "",
  employmentType: "Full-time",
  profileStatus: "probation",
  probationMonths: "",
  resignationPeriodEndDate: "",
  annualLeaveDays: "",
  sickLeaveDays: "",
  baseSalary: "",
  depositAmount: "",
  depositScheduledReleaseDate: "",
  phone: "",
  currentAddress: "",
  homeAddress: "",
  dateOfBirth: "",
  gender: "",
  nrcId: "",
  maritalStatus: "",
  spouseName: "",
  hasKids: "",
  kidsDetails: "",
  avatarUrl: "",
  emergencyName: "",
  emergencyPhone: "",
  workExperiences: [],
  ...overrides,
});

export const mapStaffProfileToForm = (staffProfile) => {
  if (!staffProfile) {
    return createEmptyStaffProfileForm();
  }

  let hasKids = "";
  if (staffProfile.has_kids === true) hasKids = "yes";
  if (staffProfile.has_kids === false) hasKids = "no";

  return {
    employeeCode: staffProfile.employee_code || "",
    hireDate: staffProfile.hire_date || "",
    position: staffProfile.position_title || "",
    jobPositionId: staffProfile.job_position_id
      ? String(staffProfile.job_position_id)
      : staffProfile.job_position?.id
        ? String(staffProfile.job_position.id)
        : "",
    jobDescriptionOverride: staffProfile.job_description_override || "",
    departmentId: staffProfile.department?.id ? String(staffProfile.department.id) : "",
    reportingManagerId: staffProfile.reporting_manager_id
      ? String(staffProfile.reporting_manager_id)
      : staffProfile.reporting_manager?.id
        ? String(staffProfile.reporting_manager.id)
        : "",
    employmentType: staffProfile.employment_type || "",
    profileStatus: staffProfile.profile_status || "probation",
    probationMonths:
      staffProfile.probation_months != null ? String(staffProfile.probation_months) : "",
    resignationPeriodEndDate: staffProfile.resignation_period_end_date || "",
    annualLeaveDays:
      staffProfile.annual_leave_days != null ? String(staffProfile.annual_leave_days) : "",
    sickLeaveDays:
      staffProfile.sick_leave_days != null ? String(staffProfile.sick_leave_days) : "",
    baseSalary: "",
    phone: staffProfile.phone || "",
    currentAddress: staffProfile.current_address || staffProfile.address || "",
    homeAddress: staffProfile.home_address || "",
    dateOfBirth: staffProfile.date_of_birth || "",
    gender: staffProfile.gender || "",
    nrcId: staffProfile.nrc_id || "",
    maritalStatus: staffProfile.marital_status || "",
    spouseName: staffProfile.spouse_name || "",
    hasKids,
    kidsDetails: staffProfile.kids_details || "",
    avatarUrl: staffProfile.avatar_url || "",
    emergencyName: staffProfile.emergency_contact_name || "",
    emergencyPhone: staffProfile.emergency_contact_phone || "",
    emergencyRelationship: staffProfile.emergency_contact_relationship || "",
    workExperiences: (staffProfile.work_experiences || []).map((row) => ({
      company: row.company || "",
      position: row.position || "",
      period: row.period || "",
    })),
  };
};

export const mapFormToStaffProfilePayload = (form, { avatarTempPath, includeBaseSalary = false } = {}) => {
  const payload = {
    employee_code: form.employeeCode || null,
    position_title: form.position || null,
    job_position_id: form.jobPositionId ? Number(form.jobPositionId) : null,
    job_description_override: form.jobDescriptionOverride || null,
    department_id: form.departmentId ? Number(form.departmentId) : null,
    reporting_manager_id: form.reportingManagerId ? Number(form.reportingManagerId) : null,
    employment_type: form.employmentType || null,
    profile_status: form.profileStatus || "probation",
    probation_months:
      form.profileStatus === "probation" && form.probationMonths !== ""
        ? Number(form.probationMonths)
        : null,
    resignation_period_end_date:
      form.profileStatus === "resignation_period"
        ? form.resignationPeriodEndDate || null
        : null,
    annual_leave_days:
      form.annualLeaveDays !== "" ? Number(form.annualLeaveDays) : null,
    sick_leave_days:
      form.sickLeaveDays !== "" ? Number(form.sickLeaveDays) : null,
    phone: form.phone || null,
    current_address: form.currentAddress || null,
    home_address: form.homeAddress || null,
    date_of_birth: form.dateOfBirth || null,
    gender: form.gender || null,
    nrc_id: form.nrcId || null,
    marital_status: form.maritalStatus || null,
    spouse_name: form.maritalStatus === "Married" ? form.spouseName || null : null,
    has_kids:
      form.hasKids === "yes" ? true : form.hasKids === "no" ? false : null,
    kids_details:
      form.hasKids === "yes" ? (form.kidsDetails?.trim() || null) : null,
    avatar_url: form.avatarUrl || null,
    emergency_contact_name: form.emergencyName || null,
    emergency_contact_phone: form.emergencyPhone || null,
    emergency_contact_relationship: form.emergencyRelationship || null,
    work_experiences: (form.workExperiences || [])
      .filter((row) => String(row.company || "").trim())
      .map((row) => ({
        company: row.company.trim(),
        position: row.position?.trim() || null,
        period: row.period?.trim() || null,
      })),
  };

  if (avatarTempPath) {
    payload.avatar_temp_path = avatarTempPath;
  }

  if (includeBaseSalary && form.baseSalary !== "" && form.baseSalary != null) {
    payload.base_salary = Number(form.baseSalary);
  }

  if (includeBaseSalary && form.depositAmount !== "" && form.depositAmount != null) {
    const deposit = Number(form.depositAmount);
    if (deposit > 0) {
      payload.deposit_amount = deposit;
      if (form.depositScheduledReleaseDate) {
        payload.deposit_scheduled_release_date = form.depositScheduledReleaseDate;
      }
    }
  }

  return payload;
};

export const isDocumentPdf = (doc) => {
  const mime = doc?.mime_type || "";
  if (mime === "application/pdf") return true;
  const name = (doc?.original_name || doc?.file_path || "").toLowerCase();
  return name.endsWith(".pdf");
};

/** Resolve document URL from API (absolute) or local public storage path. */
export const documentStorageUrl = (doc) => {
  if (doc?.url) return doc.url;
  if (!doc?.file_path) return "";
  if (doc.file_path.startsWith("http")) return doc.file_path;
  const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(
    /\/api\/?$/,
    "",
  );
  return `${apiBase}/storage/${doc.file_path}`;
};
