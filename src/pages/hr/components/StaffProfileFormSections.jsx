import { Link } from "react-router-dom";
import { Avatar, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import HrFormSection from "./HrFormSection";
import LabeledField from "./LabeledField";
import WorkExperienceEditor from "./WorkExperienceEditor";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  HAS_KIDS_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  PROFILE_STATUS_OPTIONS,
} from "./staffProfileFormConstants";
import { computeProbationEndDate } from "./staffProfileStatusHelpers";

export default function StaffProfileFormSections({
  form,
  setForm,
  departments = [],
  reportingManagerOptions = [],
  excludeUserId = null,
  showAccountSection = false,
  lockProfileStatusOnCreate = false,
  usersWithoutProfile = [],
  usersPagePath = "",
  avatarPreviewUrl = "",
  onUploadAvatar,
  onRemoveAvatar,
  /** When set, only render sections for that column (create page two-card layout). */
  column = null,
}) {
  const showEmploymentSections = !column || column === "left";
  const showPersonalSections = !column || column === "right";
  const showPhotoAfterEmployment = column === "left";
  const showPhotoAfterFamily = !column;
  const showMarriedFields = form.maritalStatus === "Married";
  const showKidsDetails = form.hasKids === "yes";
  const showProbationFields = form.profileStatus === "probation";
  const showResignationPeriodFields = form.profileStatus === "resignation_period";
  const probationEndPreview = showProbationFields
    ? computeProbationEndDate(form.hireDate, form.probationMonths)
    : null;

  const patchForm = (patch) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (patch.maritalStatus && patch.maritalStatus !== "Married") {
        next.spouseName = "";
        next.hasKids = "";
        next.kidsDetails = "";
      }
      if (patch.hasKids && patch.hasKids !== "yes") {
        next.kidsDetails = "";
      }
      if (patch.profileStatus && patch.profileStatus !== "probation") {
        next.probationMonths = "";
      }
      if (patch.profileStatus && patch.profileStatus !== "resignation_period") {
        next.resignationPeriodEndDate = "";
      }
      return next;
    });
  };

  return (
    <Stack spacing={0}>
      {showEmploymentSections && showAccountSection ? (
        <HrFormSection
          title="Account"
          description="Link this profile to a user account."
        >
          <LabeledField id="staff-user-account" label="User account" required>
            <TextField
              id="staff-user-account"
              select
              size="small"
              fullWidth
              value={form.userId}
              onChange={(e) => patchForm({ userId: e.target.value })}
              helperText={
                usersWithoutProfile.length === 0
                  ? "No available user account to link. Please create a user account first."
                  : "Select a user account that does not already have a staff profile."
              }
            >
              {usersWithoutProfile.map((user) => (
                <MenuItem key={user.id} value={String(user.id)}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>
          </LabeledField>
          {usersWithoutProfile.length === 0 ? (
            <Button
              component={Link}
              to={usersPagePath}
              size="small"
              variant="outlined"
              sx={{ alignSelf: "flex-start" }}
            >
              Create new user first
            </Button>
          ) : null}
        </HrFormSection>
      ) : null}

      {showEmploymentSections ? (
      <HrFormSection title="">
        <LabeledField id="staff-employee-code" label="Employee code">
          <TextField
            id="staff-employee-code"
            size="small"
            fullWidth
            value={form.employeeCode}
            onChange={(e) => patchForm({ employeeCode: e.target.value })}
          />
        </LabeledField>
        <LabeledField id="staff-position" label="Position title">
          <TextField
            id="staff-position"
            size="small"
            fullWidth
            value={form.position}
            onChange={(e) => patchForm({ position: e.target.value })}
          />
        </LabeledField>
        <LabeledField id="staff-department" label="Department">
          <TextField
            id="staff-department"
            select
            size="small"
            fullWidth
            value={form.departmentId}
            onChange={(e) => patchForm({ departmentId: e.target.value })}
          >
            <MenuItem value="">Unassigned</MenuItem>
            {departments.map((department) => (
              <MenuItem key={department.id} value={String(department.id)}>
                {department.name}
              </MenuItem>
            ))}
          </TextField>
        </LabeledField>
        <LabeledField id="staff-reporting-manager" label="Reporting manager">
          <TextField
            id="staff-reporting-manager"
            select
            size="small"
            fullWidth
            value={form.reportingManagerId}
            onChange={(e) => patchForm({ reportingManagerId: e.target.value })}
            helperText="Used for the organization structure chart."
          >
            <MenuItem value="">None</MenuItem>
            {reportingManagerOptions
              .filter(
                (option) => String(option.id) !== String(excludeUserId ?? ""),
              )
              .map((option) => (
                <MenuItem key={option.id} value={String(option.id)}>
                  {option.name}
                </MenuItem>
              ))}
          </TextField>
        </LabeledField>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
          <LabeledField id="staff-employment-type" label="Employment type">
            <TextField
              id="staff-employment-type"
              select
              size="small"
              fullWidth
              value={form.employmentType}
              onChange={(e) => patchForm({ employmentType: e.target.value })}
            >
              {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </LabeledField>
          {showAccountSection ? (
            <LabeledField id="staff-hire-date" label="Hire date">
              <TextField
                id="staff-hire-date"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.hireDate}
                onChange={(e) => patchForm({ hireDate: e.target.value })}
              />
            </LabeledField>
          ) : null}
        </Stack>
        {showAccountSection ? (
          <LabeledField id="staff-base-salary" label="Basic salary (MMK)" required>
            <TextField
              id="staff-base-salary"
              type="number"
              size="small"
              fullWidth
              required
              inputProps={{ min: 0, step: 1000 }}
              value={form.baseSalary}
              onChange={(e) => patchForm({ baseSalary: e.target.value })}
            />
          </LabeledField>
        ) : null}
      </HrFormSection>
      ) : null}

      {showEmploymentSections ? (
      <HrFormSection
        title="Profile status"
        description="Default for new staff is Probation. HR updates to Permanent after probation ends."
      >
        <LabeledField id="staff-profile-status" label="Profile status">
          <TextField
            id="staff-profile-status"
            select
            size="small"
            fullWidth
            value={form.profileStatus}
            disabled={lockProfileStatusOnCreate && showAccountSection}
            onChange={(e) => patchForm({ profileStatus: e.target.value })}
          >
            {PROFILE_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </LabeledField>
        {showProbationFields ? (
          <Stack spacing={1}>
            <LabeledField id="staff-probation-months" label="Probation period (months)" required>
              <TextField
                id="staff-probation-months"
                type="number"
                size="small"
                fullWidth
                required
                inputProps={{ min: 1, step: 1 }}
                value={form.probationMonths}
                onChange={(e) =>
                  patchForm({ probationMonths: e.target.value.replace(/\D/g, "") })
                }
              />
            </LabeledField>
            {probationEndPreview ? (
              <Typography variant="caption" color="text.secondary">
                Probation ends: {probationEndPreview}
              </Typography>
            ) : null}
          </Stack>
        ) : null}
        {showResignationPeriodFields ? (
          <LabeledField id="staff-resignation-period-end" label="Resignation period end date" required>
            <TextField
              id="staff-resignation-period-end"
              type="date"
              size="small"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              value={form.resignationPeriodEndDate}
              onChange={(e) => patchForm({ resignationPeriodEndDate: e.target.value })}
            />
          </LabeledField>
        ) : null}
      </HrFormSection>
      ) : null}

      {showPhotoAfterEmployment ? (
      <HrFormSection title="Profile photo" showDivider={false}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={avatarPreviewUrl || form.avatarUrl || ""}
            alt="Profile"
            sx={{ width: 72, height: 72 }}
          />
          <Stack direction="row" spacing={1}>
            <Button component="label" size="small" variant="outlined">
              Upload photo
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => onUploadAvatar?.(e.target.files?.[0])}
              />
            </Button>
            <Button
              size="small"
              color="warning"
              onClick={onRemoveAvatar}
              disabled={!form.avatarUrl && !avatarPreviewUrl}
            >
              Remove
            </Button>
          </Stack>
        </Stack>
      </HrFormSection>
      ) : null}

      {showPersonalSections ? (
      <HrFormSection title="Personal & contact">
        <LabeledField id="staff-phone" label="Phone">
          <TextField
            id="staff-phone"
            size="small"
            fullWidth
            value={form.phone}
            onChange={(e) => patchForm({ phone: e.target.value })}
          />
        </LabeledField>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
          <LabeledField id="staff-dob" label="Date of birth">
            <TextField
              id="staff-dob"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.dateOfBirth}
              onChange={(e) => patchForm({ dateOfBirth: e.target.value })}
            />
          </LabeledField>
          <LabeledField id="staff-gender" label="Gender">
            <TextField
              id="staff-gender"
              size="small"
              fullWidth
              value={form.gender}
              onChange={(e) => patchForm({ gender: e.target.value })}
            />
          </LabeledField>
        </Stack>
        <LabeledField id="staff-nrc-id" label="NRC / National ID">
          <TextField
            id="staff-nrc-id"
            size="small"
            fullWidth
            value={form.nrcId}
            onChange={(e) => patchForm({ nrcId: e.target.value })}
          />
        </LabeledField>
      </HrFormSection>
      ) : null}

      {showPersonalSections ? (
      <HrFormSection title="Addresses">
        <LabeledField id="staff-current-address" label="Current address">
          <TextField
            id="staff-current-address"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={form.currentAddress}
            onChange={(e) => patchForm({ currentAddress: e.target.value })}
          />
        </LabeledField>
        <LabeledField id="staff-home-address" label="Home address">
          <TextField
            id="staff-home-address"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={form.homeAddress}
            onChange={(e) => patchForm({ homeAddress: e.target.value })}
          />
        </LabeledField>
      </HrFormSection>
      ) : null}

      {showPersonalSections ? (
      <HrFormSection title="Family">
        <LabeledField id="staff-marital-status" label="Marital status">
          <TextField
            id="staff-marital-status"
            select
            size="small"
            fullWidth
            value={form.maritalStatus}
            onChange={(e) => patchForm({ maritalStatus: e.target.value })}
          >
            <MenuItem value="">—</MenuItem>
            {MARITAL_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </LabeledField>
        {showMarriedFields ? (
          <>
            <LabeledField id="staff-spouse-name" label="Spouse name">
              <TextField
                id="staff-spouse-name"
                size="small"
                fullWidth
                value={form.spouseName}
                onChange={(e) => patchForm({ spouseName: e.target.value })}
              />
            </LabeledField>
            <LabeledField id="staff-has-kids" label="Have kids?">
              <TextField
                id="staff-has-kids"
                select
                size="small"
                fullWidth
                value={form.hasKids}
                onChange={(e) => patchForm({ hasKids: e.target.value })}
              >
                {HAS_KIDS_OPTIONS.map((option) => (
                  <MenuItem key={option.value || "empty"} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </LabeledField>
            {showKidsDetails ? (
              <LabeledField id="staff-kids-details" label="Kids (count and ages)">
                <TextField
                  id="staff-kids-details"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  placeholder="e.g. 2 children — ages 5 and 8"
                  value={form.kidsDetails}
                  onChange={(e) => patchForm({ kidsDetails: e.target.value })}
                  helperText="How many children and how old they are."
                />
              </LabeledField>
            ) : null}
          </>
        ) : null}
      </HrFormSection>
      ) : null}

      {showPhotoAfterFamily ? (
      <HrFormSection title="Profile photo">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={avatarPreviewUrl || form.avatarUrl || ""}
            alt="Profile"
            sx={{ width: 72, height: 72 }}
          />
          <Stack direction="row" spacing={1}>
            <Button component="label" size="small" variant="outlined">
              Upload photo
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => onUploadAvatar?.(e.target.files?.[0])}
              />
            </Button>
            <Button
              size="small"
              color="warning"
              onClick={onRemoveAvatar}
              disabled={!form.avatarUrl && !avatarPreviewUrl}
            >
              Remove
            </Button>
          </Stack>
        </Stack>
      </HrFormSection>
      ) : null}

      {showPersonalSections ? (
      <HrFormSection
        title="Work experience"
        description="Previous roles outside this clinic (optional)."
      >
        <WorkExperienceEditor
          rows={form.workExperiences}
          onChange={(workExperiences) => patchForm({ workExperiences })}
        />
      </HrFormSection>
      ) : null}

      {showPersonalSections ? (
      <HrFormSection title="Emergency contact" showDivider={false}>
        <LabeledField id="staff-emergency-name" label="Contact name">
          <TextField
            id="staff-emergency-name"
            size="small"
            fullWidth
            value={form.emergencyName}
            onChange={(e) => patchForm({ emergencyName: e.target.value })}
          />
        </LabeledField>
        <LabeledField id="staff-emergency-phone" label="Contact phone">
          <TextField
            id="staff-emergency-phone"
            size="small"
            fullWidth
            value={form.emergencyPhone}
            onChange={(e) => patchForm({ emergencyPhone: e.target.value })}
          />
        </LabeledField>
        <LabeledField id="staff-emergency-relationship" label="Relationship">
          <TextField
            id="staff-emergency-relationship"
            size="small"
            fullWidth
            placeholder="e.g. Spouse, Parent, Sibling"
            value={form.emergencyRelationship}
            onChange={(e) => patchForm({ emergencyRelationship: e.target.value })}
          />
        </LabeledField>
      </HrFormSection>
      ) : null}
    </Stack>
  );
}
