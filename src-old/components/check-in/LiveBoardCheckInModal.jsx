import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../common/LoadingIndicator";
import dayjs from "dayjs";
import { createVisit } from "../../services/visitService";
import { searchPatientsForCheckIn } from "../../services/patientService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import {
  isPhoneQueryInput,
  normalizePhoneQuery,
} from "../../utils/checkInSearchUtils";
import CheckInConfirmDialog from "./CheckInConfirmDialog";
import useAuthStore from "../../stores/authStore";
import { hidePatientContactDetails } from "../../utils/accessUtils";

function patientListFromResponse(res) {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
}

export default function LiveBoardCheckInModal({
  open,
  onClose,
  onVisitCreated,
}) {
  const navigate = useNavigate();
  const { pushToast } = useToastStore();
  const { user } = useAuthStore();
  const restrictPatientRegistration = hidePatientContactDetails(user);
  const [customerMode, setCustomerMode] = useState("existing");
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resetWizard = useCallback(() => {
    setCustomerMode("existing");
    setSearchText("");
    setSearchError("");
    setResults([]);
    setSelectedPatient(null);
    setConfirmOpen(false);
  }, []);

  useEffect(() => {
    if (!open) resetWizard();
    else if (restrictPatientRegistration) {
      setCustomerMode("existing");
    }
  }, [open, resetWizard, restrictPatientRegistration]);

  const runSearch = async () => {
    const q = searchText.trim();
    if (!q) {
      setSearchError(
        restrictPatientRegistration
          ? "Enter a name to search."
          : "Enter a name or full phone number to search.",
      );
      return;
    }
    setSearching(true);
    setSearchError("");
    setResults([]);
    setSelectedPatient(null);
    try {
      let res;
      if (isPhoneQueryInput(q)) {
        const phone = normalizePhoneQuery(q);
        res = await searchPatientsForCheckIn({ phone });
      } else {
        res = await searchPatientsForCheckIn({ search: q });
      }
      const list = patientListFromResponse(res);
      setResults(list);
      if (!list.length) {
        setSearchError("No patients found.");
      }
    } catch (err) {
      setSearchError(resolveApiError(err, "Search failed."));
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  };

  const handleCreatePatient = () => {
    onClose();
    navigate("/patients/new");
  };

  const handleStartCheckIn = () => {
    if (!selectedPatient) return;
    setConfirmOpen(true);
  };

  const handleCheckIn = async ({
    newComplaint,
    followUp,
    checkInMode,
    note,
  }) => {
    try {
      await createVisit({
        patient_id: selectedPatient.id,
        new_complaint: newComplaint,
        follow_up: followUp,
        check_in_mode: checkInMode,
        notes: note,
      });
      setConfirmOpen(false);
      resetWizard();
      onClose();
      onVisitCreated?.();
      pushToast({
        message: "Patient checked in — visit is in Waiting.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Check-in failed."),
        severity: "error",
      });
    }
  };

  return (
    <>
      <Dialog
        open={open && !confirmOpen}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>New visit / Check-in</DialogTitle>
        <DialogContent>
          {restrictPatientRegistration && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Patient registration is handled by reception. Search for an
              existing patient by name, or ask reception to register a new
              patient before check-in.
            </Alert>
          )}

          {!restrictPatientRegistration && (
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Customer
              </Typography>
              <RadioGroup
                value={customerMode}
                onChange={(e) => {
                  setCustomerMode(e.target.value);
                  setResults([]);
                  setSelectedPatient(null);
                  setSearchError("");
                }}
              >
                <FormControlLabel
                  value="new"
                  control={<Radio />}
                  label="New Customer"
                />
                <FormControlLabel
                  value="existing"
                  control={<Radio />}
                  label="Existing Customer"
                />
              </RadioGroup>
            </FormControl>
          )}

          {!restrictPatientRegistration && customerMode === "new" && (
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5 }}
              >
                Register a new patient with intake, then check in from the
                patient profile page.
              </Typography>
              <Button variant="contained" onClick={handleCreatePatient}>
                Create Patient
              </Button>
            </Box>
          )}

          {(restrictPatientRegistration || customerMode === "existing") && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {restrictPatientRegistration
                  ? "Search by patient name (press Enter or Search)."
                  : "Search by name (press Enter or Search) or enter the full phone number for an exact match."}
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems="flex-start"
              >
                <TextField
                  label={restrictPatientRegistration ? "Name" : "Name or phone"}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  fullWidth
                  size="small"
                  placeholder={
                    restrictPatientRegistration
                      ? "e.g. Maung"
                      : "e.g. Maung or 09123456789"
                  }
                />
                <Button
                  variant="outlined"
                  onClick={runSearch}
                  disabled={searching}
                >
                  Search
                </Button>
              </Stack>
              {searching && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <LoadingIndicator size={28} />
                </Box>
              )}
              {searchError && (
                <Typography variant="body2" color="error">
                  {searchError}
                </Typography>
              )}
              {results.length > 0 && (
                <List
                  dense
                  disablePadding
                  sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}
                >
                  {results.map((p) => (
                    <ListItemButton
                      key={p.id}
                      selected={selectedPatient?.id === p.id}
                      onClick={() => setSelectedPatient(p)}
                    >
                      <ListItemText
                        primary={
                          <Stack
                            direction="row"
                            justifyContent={"space-between"}
                            alignItems="center"
                            useFlexGap
                            flexWrap="wrap"
                          >
                            <span>
                              {p.name} (Client ID: {p.client_id})
                            </span>
                            <Chip
                              size="small"
                              label={
                                p.status === "inactive" ? "Inactive" : "Active"
                              }
                              color={
                                p.status === "inactive" ? "default" : "success"
                              }
                              variant={
                                p.status === "inactive" ? "outlined" : "filled"
                              }
                            />
                          </Stack>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            fontSize={"0.7rem"}
                            color="text.secondary"
                          >
                            DOB:{" "}
                            {p.dob ? dayjs(p.dob).format("D MMM YYYY") : "—"} ·
                            Last visit:{" "}
                            {p.last_visit_at
                              ? dayjs(p.last_visit_at).format("D MMM YYYY")
                              : "—"}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          {selectedPatient && (
            <Button
              variant="contained"
              onClick={handleStartCheckIn}
              sx={{ alignSelf: "flex-start" }}
            >
              Start Check-in
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <CheckInConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        patientName={selectedPatient?.name ?? ""}
        onCheckIn={handleCheckIn}
      />
    </>
  );
}
