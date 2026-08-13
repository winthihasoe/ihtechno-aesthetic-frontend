import { useMemo, useState } from "react";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import HrPageShell from "./components/HrPageShell";
import { createPublicHoliday, getPublicHolidays } from "../../services/hrService";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import { useEffect } from "react";

function monthLabelFromDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

const CURRENT_YEAR = new Date().getFullYear().toString();
const MAIN_BRANCH_NAME = "Main Branch";

export default function HrPublicHolidaysPage() {
  const { pushToast } = useToastStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    date: "",
    name: "",
  });
  const showHolidayList = !loading && rows.length > 0;

  const load = async (targetYear = year) => {
    setLoading(true);
    try {
      const res = await getPublicHolidays({ year: targetYear || undefined });
      setRows(Array.isArray(res) ? res : []);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load public holidays."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const groupedByMonth = useMemo(() => {
    const groups = {};
    const sorted = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach((row) => {
      const key = monthLabelFromDate(row.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return groups;
  }, [rows]);

  const handleCreate = async () => {
    try {
      await createPublicHoliday({
        date: form.date,
        name: form.name,
        branch_name: MAIN_BRANCH_NAME,
      });
      pushToast({ message: "Public holiday created.", severity: "success" });
      setOpenCreate(false);
      setForm({ date: "", name: "" });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to create public holiday."),
        severity: "error",
      });
    }
  };

  return (
    <HrPageShell title="HR Module" subtitle="Public holidays">
      {showHolidayList ? (
        <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                size="small"
                label="Year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                sx={{ maxWidth: 160 }}
              />
              <Button variant="outlined" onClick={() => load(year)}>
                Filter
              </Button>
            </Stack>
            <Button variant="contained" onClick={() => setOpenCreate(true)}>
              Create Holiday
            </Button>
          </Stack>
        </Card>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : null}

      {!loading && rows.length === 0 ? (
        <PublicHolidaysEmptyState
          year={year}
          isFilteredYear={year !== CURRENT_YEAR}
          onCreateClick={() => setOpenCreate(true)}
          onYearChange={setYear}
          onFilterYear={(targetYear) => load(targetYear)}
          onResetYear={() => {
            setYear(CURRENT_YEAR);
            load(CURRENT_YEAR);
          }}
        />
      ) : null}

      {showHolidayList ? (
      <Stack spacing={2}>
          {Object.entries(groupedByMonth).map(([month, holidays]) => (
            <Card key={month} variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontSize: "1rem", mb: 1 }}>
                {month}
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Stack spacing={1.2}>
                {holidays.map((holiday) => (
                  <Box
                    key={holiday.id}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                      px: 1.5,
                      py: 1.2,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(holiday.date))}
                      {" - "}
                      {holiday.name}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Card>
          ))}
      </Stack>
      ) : null}

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Public Holiday</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Holiday name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Thingyan Holiday"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.date || !form.name.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}

function PublicHolidaysEmptyState({
  year,
  isFilteredYear,
  onCreateClick,
  onYearChange,
  onFilterYear,
  onResetYear,
}) {
  if (isFilteredYear) {
    return (
      <Card variant="outlined" sx={{ p: 2.5, bgcolor: "action.hover" }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          No public holidays for {year}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          There are no holidays recorded for this year. Switch back to the current year or
          add holidays for {year}.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <TextField
            size="small"
            label="Year"
            type="number"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            sx={{ maxWidth: 160 }}
          />
          <Button size="small" variant="outlined" onClick={() => onFilterYear(year)}>
            Filter
          </Button>
          <Button size="small" variant="outlined" onClick={onResetYear}>
            Show {CURRENT_YEAR}
          </Button>
          <Button size="small" variant="contained" onClick={onCreateClick}>
            Create holiday
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        textAlign: "center",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <EventOutlinedIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
      <Typography variant="h6" fontWeight={700} gutterBottom>
        No public holidays yet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mx: "auto", mb: 2 }}>
        Define official non-working days for the clinic. They feed into payroll and absence
        calculations so staff are not penalized on holidays.
      </Typography>
      <Stack
        spacing={0.75}
        sx={{
          maxWidth: 480,
          mx: "auto",
          textAlign: "left",
          mb: 2,
          px: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Who it applies to:</strong> All staff at {MAIN_BRANCH_NAME} on the dates you
          add here.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Payroll impact:</strong> When payroll runs, public holiday dates are removed
          from required workdays. Missing attendance on those days does not count toward
          absence penalties.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Scheduling:</strong> Holidays do not replace weekly schedules — they exempt
          the date from absence rules for staff who would otherwise be required to work.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Planning:</strong> Add national and local holidays for the full year so
          monthly payroll and reports stay accurate.
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}>
        <Button variant="contained" onClick={onCreateClick}>
          Create holiday
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        After you add holidays, they are grouped by month and you can filter by year.
      </Typography>
    </Box>
  );
}
