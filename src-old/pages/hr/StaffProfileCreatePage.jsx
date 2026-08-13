import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Grid, Stack } from "@mui/material";
import HrPageShell from "./components/HrPageShell";
import StaffProfileFormSections from "./components/StaffProfileFormSections";
import {
  createEmptyStaffProfileForm,
  mapFormToStaffProfilePayload,
} from "./components/staffProfileFormConstants";
import { getUsers } from "../../services/usersService";
import {
  createStaffProfile,
  deleteUploadedStaffAvatar,
  getDepartments,
  getJobPositions,
  getStaffs,
  uploadStaffAvatar,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";

export default function StaffProfileCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pushToast } = useToastStore();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);
  const [avatarTempPath, setAvatarTempPath] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(() => createEmptyStaffProfileForm());

  useEffect(() => {
    Promise.all([getUsers(), getDepartments(), getJobPositions(), getStaffs()])
      .then(([usersPayload, departmentsPayload, jobPositionsPayload, staffsPayload]) => {
        setUsers(usersPayload);
        setDepartments(departmentsPayload);
        setJobPositions(jobPositionsPayload || []);
        setManagerOptions(
          (staffsPayload || []).map((member) => ({
            id: member.id,
            name: member.name,
          })),
        );
      })
      .catch((error) => {
        pushToast({
          message: resolveApiError(error, "Failed to load form data."),
          severity: "error",
        });
      });
  }, [pushToast]);

  const isCeoAccount = (user) =>
    user.role === "owner" ||
    (user.roles || []).some((role) => role.slug === "owner");
  const usersWithoutProfile = users.filter(
    (user) => !user.staff_profile && !isCeoAccount(user),
  );
  const staffListPath = location.pathname.replace(/\/create$/, "");
  const workspacePrefix = location.pathname.startsWith("/owner/")
    ? "/owner"
    : "/admin";
  const usersPagePath = `${workspacePrefix}/users`;

  useEffect(
    () => () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    },
    [avatarPreviewUrl],
  );

  const submit = async () => {
    if (!form.userId) {
      pushToast({
        message: "Please select a user account.",
        severity: "warning",
      });
      return;
    }
    if (!form.baseSalary || Number(form.baseSalary) <= 0) {
      pushToast({ message: "Basic salary is required.", severity: "warning" });
      return;
    }
    if (form.profileStatus === "probation" && !form.probationMonths) {
      pushToast({
        message: "Probation period (months) is required.",
        severity: "warning",
      });
      return;
    }
    if (
      form.profileStatus === "resignation_period" &&
      !form.resignationPeriodEndDate
    ) {
      pushToast({
        message: "Resignation period end date is required.",
        severity: "warning",
      });
      return;
    }
    setSubmitting(true);
    try {
      const created = await createStaffProfile({
        user_id: Number(form.userId),
        hire_date: form.hireDate,
        ...mapFormToStaffProfilePayload(form, {
          avatarTempPath,
          includeBaseSalary: true,
        }),
      });
      const staffUserId =
        created?.user_id ?? created?.user?.id ?? Number(form.userId);
      pushToast({
        message:
          "Staff profile created. You can upload documents on the next screen.",
        severity: "success",
      });
      navigate(`${staffListPath}/${staffUserId}`, {
        state: { highlightDocuments: true },
      });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to create profile."),
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onUploadAvatar = async (file) => {
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarPreviewUrl(localPreview);
    try {
      if (avatarTempPath) {
        await deleteUploadedStaffAvatar(avatarTempPath);
      }
      const uploaded = await uploadStaffAvatar(file);
      setAvatarTempPath(uploaded.temp_path || "");
      setForm((prev) => ({ ...prev, avatarUrl: uploaded.url || "" }));
      pushToast({ message: "Profile photo uploaded.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to upload photo."),
        severity: "error",
      });
    }
  };

  const removeSelectedAvatar = async () => {
    try {
      if (avatarTempPath) {
        await deleteUploadedStaffAvatar(avatarTempPath);
      }
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      setAvatarTempPath("");
      setAvatarPreviewUrl("");
      setForm((prev) => ({ ...prev, avatarUrl: "" }));
      pushToast({
        message: "Selected profile photo removed.",
        severity: "success",
      });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to remove selected photo."),
        severity: "error",
      });
    }
  };

  const formSectionsProps = {
    form,
    setForm,
    departments,
    jobPositions,
    reportingManagerOptions: managerOptions,
    excludeUserId: form.userId || null,
    showAccountSection: true,
    lockProfileStatusOnCreate: true,
    usersWithoutProfile,
    usersPagePath,
    avatarPreviewUrl,
    onUploadAvatar,
    onRemoveAvatar: removeSelectedAvatar,
  };

  const handleCancel = async () => {
    if (avatarTempPath) {
      try {
        await deleteUploadedStaffAvatar(avatarTempPath);
      } catch {
        // Best-effort cleanup.
      }
    }
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    navigate(staffListPath);
  };

  return (
    <HrPageShell title="HR Module" subtitle="Create staff profile">
      <Button
        variant="contained"
        onClick={() => navigate(staffListPath)}
        sx={{ mb: 2 }}
      >
        Back to staff list
      </Button>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{ borderRadius: 1, p: 2.5, height: "100%" }}
          >
            <StaffProfileFormSections {...formSectionsProps} column="left" />
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{ borderRadius: 1, p: 2.5, height: "100%" }}
          >
            <StaffProfileFormSections {...formSectionsProps} column="right" />
          </Card>
        </Grid>
        <Grid size={12}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="contained"
              onClick={submit}
              disabled={submitting || usersWithoutProfile.length === 0}
            >
              {submitting ? "Creating…" : "Create profile"}
            </Button>
            <Button onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </HrPageShell>
  );
}
