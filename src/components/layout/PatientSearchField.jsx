import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Autocomplete,
  CircularProgress,
  InputAdornment,
  TextField,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import useAuthStore from "../../stores/authStore";
import { searchPatientsForCheckIn } from "../../services/patientService";
import {
  hasPermission,
  hidePatientContactDetails,
} from "../../utils/accessUtils";
import {
  isPhoneQueryInput,
  normalizePhoneQuery,
} from "../../utils/checkInSearchUtils";
import { resolvePatientNumber } from "../../utils/patientUtils";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";
import { getWorkspaceChromeColors } from "./workspaceChromeColors";

const MIN_SEARCH_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 300;

function patientListFromResponse(res) {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
}

function formatPatientOptionLabel(patient, hideContact) {
  if (!patient) return "";
  const parts = [patient.name || "Unknown"];
  const number = resolvePatientNumber(patient);
  if (number && number !== "—") parts.push(number);
  if (!hideContact && patient.phone) parts.push(patient.phone);
  return parts.join(" · ");
}

/**
 * @param {{ sx?: import("@mui/material").SxProps }} [props]
 */
export default function PatientSearchField({ sx }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const hideContact = hidePatientContactDetails(user);
  const prefix = getWorkspaceUrlPrefix(user);

  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const showPatientSearch = hasPermission(user, "patients.view");

  useEffect(() => {
    const query = inputValue.trim();
    if (!showPatientSearch || query.length < MIN_SEARCH_CHARS) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = isPhoneQueryInput(query)
          ? await searchPatientsForCheckIn({ phone: normalizePhoneQuery(query) })
          : await searchPatientsForCheckIn({ search: query });
        if (!cancelled) {
          setOptions(patientListFromResponse(res));
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputValue, showPatientSearch]);

  const handleSelect = useCallback(
    (_event, patient) => {
      if (!patient?.id) return;
      setInputValue("");
      setOptions([]);
      navigate(`${prefix}/patients/${patient.id}`);
    },
    [navigate, prefix],
  );

  if (!showPatientSearch) {
    return null;
  }

  const isDark = theme.palette.mode === "dark";
  const chrome = getWorkspaceChromeColors(isDark, theme);
  const titleColor = chrome.titleColor;
  const subtleText = chrome.utilitySubtle;

  return (
    <Autocomplete
      size="small"
      value={null}
      options={options}
      loading={loading}
      inputValue={inputValue}
      onInputChange={(_event, value, reason) => {
        if (reason === "input" || reason === "clear") {
          setInputValue(value);
        }
      }}
      onChange={handleSelect}
      getOptionLabel={(option) => formatPatientOptionLabel(option, hideContact)}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      filterOptions={(items) => items}
      forcePopupIcon={false}
      popupIcon={null}
      clearOnBlur={false}
      noOptionsText={
        inputValue.trim().length < MIN_SEARCH_CHARS
          ? `Type at least ${MIN_SEARCH_CHARS} characters`
          : "No patients found"
      }
      slotProps={{
        paper: {
          sx: { mt: 0.5 },
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Patient search"
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: subtleText }} />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress
                      color="inherit"
                      size={16}
                      sx={{ mr: 0.5 }}
                    />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
              sx: {
                color: titleColor,
                "&::placeholder": {
                  color: subtleText,
                  opacity: 1,
                },
                "&::-webkit-input-placeholder": {
                  color: subtleText,
                  opacity: 1,
                },
              },
            },
          }}
        />
      )}
      sx={[
        {
          flex: { xs: 1, md: "0 0 auto" },
          minWidth: { xs: 0, md: 300 },
          width: { xs: "100%", md: 300 },
          maxWidth: { xs: "100%", md: 300 },
          "& .MuiOutlinedInput-root": {
            borderRadius: "12px",
            bgcolor: chrome.searchFieldBg,
            height: 38,
            fontSize: 13,
            paddingRight: "8px !important",
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.12)",
          },
          "& .MuiOutlinedInput-input": {
            "&&::placeholder": {
              color: subtleText,
              opacity: 1,
            },
            "&&::-webkit-input-placeholder": {
              color: subtleText,
              opacity: 1,
            },
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}
