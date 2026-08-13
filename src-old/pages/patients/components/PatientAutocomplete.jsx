import { useCallback, useRef, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import LoadingIndicator from "../../../components/common/LoadingIndicator";
import { searchPatientsAutocomplete } from "../../../services/patientService";

const DEBOUNCE_MS = 300;

export default function PatientAutocomplete({
  label = "Patient",
  value,
  onChange,
  multiple = false,
  excludePatientId = null,
  size = "small",
  fullWidth = true,
}) {
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const requestRef = useRef(0);

  const runSearch = useCallback(
    (query) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!query || query.trim().length < 2) {
        setOptions([]);
        return;
      }
      timerRef.current = setTimeout(async () => {
        const token = ++requestRef.current;
        setLoading(true);
        try {
          const rows = await searchPatientsAutocomplete(query.trim());
          if (requestRef.current !== token) return;
          const list = (Array.isArray(rows) ? rows : []).filter(
            (p) => !excludePatientId || Number(p.id) !== Number(excludePatientId),
          );
          setOptions(list);
        } catch {
          if (requestRef.current === token) setOptions([]);
        } finally {
          if (requestRef.current === token) setLoading(false);
        }
      }, DEBOUNCE_MS);
    },
    [excludePatientId],
  );

  return (
    <Autocomplete
      multiple={multiple}
      size={size}
      fullWidth={fullWidth}
      options={options}
      value={value}
      onChange={(_, next) => onChange(next)}
      inputValue={inputValue}
      onInputChange={(_, next, reason) => {
        setInputValue(next);
        if (reason === "input") runSearch(next);
      }}
      getOptionLabel={(opt) =>
        opt ? `${opt.name || "Patient"}${opt.phone ? ` · ${opt.phone}` : ""}` : ""
      }
      isOptionEqualToValue={(a, b) => Number(a?.id) === Number(b?.id)}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder="Search name, phone, or ID"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <LoadingIndicator size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
