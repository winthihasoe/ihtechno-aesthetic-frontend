import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import useLiveBoardStore from "../../stores/liveBoardStore";

const DOCTORS = [{ id: 3, name: "Dr. Kyaw Kyaw" }];

export default function FilterBar() {
  const { searchQuery, doctorFilter, setSearchQuery, setDoctorFilter } =
    useLiveBoardStore();

  return (
    <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap" mb={2}>
      <TextField
        size="small"
        placeholder="Search patient…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <SearchIcon
              sx={{ mr: 0.5, color: "text.secondary", fontSize: 18 }}
            />
          ),
        }}
        sx={{ width: { xs: "100%", sm: 240 }, minWidth: 0 }}
      />

      <FormControl
        size="small"
        sx={{ width: { xs: "100%", sm: 220 }, minWidth: 0 }}
      >
        <InputLabel>Doctor</InputLabel>
        <Select
          value={doctorFilter}
          label="Doctor"
          onChange={(e) => setDoctorFilter(e.target.value)}
        >
          <MenuItem value="">All Doctors</MenuItem>
          {DOCTORS.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
