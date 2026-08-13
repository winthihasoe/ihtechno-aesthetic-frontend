import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

function formatPatientBirthDisplay(patient) {
  if (patient?.dob) {
    return dayjs(patient.dob).format("D MMMM YYYY");
  }
  const d = patient?.birth_day;
  const m = patient?.birth_month;
  const y = patient?.birth_year;
  if (d == null && m == null && y == null) return "-";
  return [d ?? "—", m ?? "—", y ?? "—"].join(" / ");
}

function SectionField({ label, value }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontWeight: 600,
          textTransform: "uppercase",
          fontSize: 10,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.2, fontWeight: 500 }}>
        {value || "-"}
      </Typography>
    </Box>
  );
}

function SectionCard({ title, fields, tone = "primary" }) {
  const toneConfig = {
    primary: { bg: "primary.light", text: "primary.dark" },
    info: { bg: "info.light", text: "info.dark" },
    success: { bg: "success.light", text: "success.dark" },
    secondary: { bg: "secondary.light", text: "secondary.dark" },
  };
  const style = toneConfig[tone] ?? toneConfig.primary;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        p: 1.25,
        bgcolor: "background.paper",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "inline-flex",
          mb: 0.75,
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          fontWeight: 700,
          bgcolor: style.bg,
          color: style.text,
          lineHeight: 1.4,
        }}
      >
        {title}
      </Typography>
      <Stack spacing={1}>
        {fields.map((field) => (
          <SectionField key={field.label} label={field.label} value={field.value} />
        ))}
      </Stack>
    </Box>
  );
}

export default function PatientInfoTab({
  patient,
  showClinicalHistoryWarning,
  editingInfo,
  canManagePatient,
  hideContactDetails = false,
  editForm,
  setEditForm,
  handleSaveInfo,
  savingInfo,
  syncEditableState,
  setEditingInfo,
}) {
  if (editingInfo && canManagePatient) {
    return (
      <Stack spacing={2} maxWidth={560}>
        {showClinicalHistoryWarning && (
          <Alert severity="warning">
            Clinical medical history is not filled in yet. Complete it on the Medical History tab before
            consultation.
          </Alert>
        )}
        <TextField
          label="Full Name"
          value={editForm.name}
          onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          fullWidth
        />
        {!hideContactDetails && (
          <TextField
            label="Phone"
            value={editForm.phone}
            onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
            fullWidth
          />
        )}
        <FormControl fullWidth>
          <InputLabel>Type</InputLabel>
          <Select
            value={editForm.type}
            label="Type"
            onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            <MenuItem value="customer">Customer</MenuItem>
            <MenuItem value="relative">Relative</MenuItem>
            <MenuItem value="friends">Friends</MenuItem>
            <MenuItem value="doctor">Doctor</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Gender</InputLabel>
          <Select
            value={editForm.gender}
            label="Gender"
            onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value }))}
          >
            <MenuItem value="">-</MenuItem>
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
          </Select>
        </FormControl>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Birth day"
            type="number"
            value={editForm.birth_day}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, birth_day: e.target.value }))
            }
            slotProps={{ htmlInput: { min: 1, max: 31 } }}
            fullWidth
          />
          <TextField
            label="Birth month"
            type="number"
            value={editForm.birth_month}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, birth_month: e.target.value }))
            }
            slotProps={{ htmlInput: { min: 1, max: 12 } }}
            fullWidth
          />
          <TextField
            label="Birth year"
            type="number"
            value={editForm.birth_year}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, birth_year: e.target.value }))
            }
            slotProps={{ htmlInput: { min: 1900, max: 2100 } }}
            fullWidth
          />
        </Stack>
        <TextField
          label="Weight (kg)"
          type="number"
          value={editForm.weight_kg}
          onChange={(e) =>
            setEditForm((prev) => ({ ...prev, weight_kg: e.target.value }))
          }
          fullWidth
        />
        <TextField
          label="Height (cm)"
          type="number"
          value={editForm.height_cm}
          onChange={(e) =>
            setEditForm((prev) => ({ ...prev, height_cm: e.target.value }))
          }
          fullWidth
        />
        {!hideContactDetails && (
          <TextField
            label="Address"
            value={editForm.address}
            onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
            fullWidth
          />
        )}
        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select
            value={editForm.status}
            label="Status"
            onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
        <Stack direction="row" spacing={1.25}>
          <Button variant="contained" onClick={handleSaveInfo} disabled={savingInfo}>
            {savingInfo ? "Saving..." : "Save Patient"}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              syncEditableState(patient);
              setEditingInfo(false);
            }}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      {showClinicalHistoryWarning && (
        <Alert severity="warning">
          Clinical medical history is not filled in yet. Complete it on the Medical History tab before
          consultation.
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 1.25,
          maxWidth: 920,
        }}
      >
        <SectionCard
          title="Identity"
          tone="primary"
          fields={[
            { label: "Full Name", value: patient.name },
            { label: "Type", value: patient.type || "customer" },
            { label: "Gender", value: patient.gender || "-" },
            { label: "Date of Birth", value: formatPatientBirthDisplay(patient) },
          ]}
        />
        {!hideContactDetails && (
          <SectionCard
            title="Contact"
            tone="info"
            fields={[
              { label: "Phone", value: patient.phone || "-" },
              { label: "Address", value: patient.address || "-" },
            ]}
          />
        )}
        <SectionCard
          title="Clinical Basics"
          tone="success"
          fields={[
            { label: "Weight (kg)", value: patient.weight_kg || "-" },
            { label: "Height (cm)", value: patient.height_cm || "-" },
            { label: "Patient Signature", value: patient.signature ? "Collected" : "-" },
          ]}
        />
        <SectionCard
          title="Administrative"
          tone="secondary"
          fields={[
            { label: "Data Collector", value: patient.data_collector?.name || "-" },
            {
              label: "Last Visit",
              value: patient.last_visit_at ? dayjs(patient.last_visit_at).format("DD-MM-YYYY HH:mm") : "-",
            },
          ]}
        />
      </Box>
    </Stack>
  );
}
