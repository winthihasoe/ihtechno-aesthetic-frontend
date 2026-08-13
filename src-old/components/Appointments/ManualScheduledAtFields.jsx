import { useEffect, useMemo, useState } from "react";
import {
  Box,
  FormHelperText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import {
  DEFAULT_APPT_END,
  DEFAULT_APPT_START,
  buildScheduledLocal,
  buildYearOptions,
  dayMenuSuffix,
  formatHolidayDate,
  holidayOnDate,
  isHourSelectable,
  isPastDate,
  isTimeSlotAllowed,
  parseScheduledParts,
} from "./manualScheduledAtUtils";

const SELECT_MENU_PROPS = {
  PaperProps: { sx: { maxHeight: 280 } },
  sx: { zIndex: (theme) => theme.zIndex.modal + 2 },
};

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function ManualScheduledAtFields({
  label = "Scheduled at",
  value,
  onChange,
  appointmentStartHm = DEFAULT_APPT_START,
  appointmentEndHm = DEFAULT_APPT_END,
  appointmentHoursRangeLabel,
  publicHolidays = [],
  loadingHolidays = false,
  hoursError = null,
  onPartsChange,
}) {
  const [parts, setParts] = useState(() => parseScheduledParts(value));

  useEffect(() => {
    if (!value) return;
    const parsed = parseScheduledParts(value);
    if (buildScheduledLocal(parsed) !== value) return;
    // Sync dropdowns when parent sets scheduled_at (default on open, holiday correction).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled field from parent value
    setParts((current) => {
      if (buildScheduledLocal(current) === value) return current;
      return parsed;
    });
  }, [value]);

  const selectedYear = Number(parts.year);
  const selectedMonth = Number(parts.month);
  const selectedDay = Number(parts.day);

  const yearOptions = useMemo(
    () => buildYearOptions(selectedYear),
    [selectedYear],
  );

  const daysInMonth = useMemo(() => {
    if (!Number.isFinite(selectedYear) || !Number.isFinite(selectedMonth)) {
      return 31;
    }
    return dayjs(
      `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`,
    ).daysInMonth();
  }, [selectedMonth, selectedYear]);

  const dayOptions = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, index) => index + 1);
  }, [daysInMonth]);

  const minuteOptions = useMemo(() => {
    const base = Array.from({ length: 60 }, (_, index) => index);
    const selected = Number(parts.minute);
    if (parts.minute !== "" && Number.isFinite(selected) && !base.includes(selected)) {
      return [...base, selected].sort((a, b) => a - b);
    }
    return base;
  }, [parts.minute]);

  const monthHolidays = useMemo(() => {
    if (!Number.isFinite(selectedYear) || !Number.isFinite(selectedMonth)) {
      return [];
    }
    return publicHolidays
      .filter((row) => {
        const d = dayjs(row.date);
        return (
          d.isValid() &&
          d.year() === selectedYear &&
          d.month() + 1 === selectedMonth
        );
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [publicHolidays, selectedMonth, selectedYear]);

  const dateSelected =
    Number.isFinite(selectedYear) &&
    Number.isFinite(selectedMonth) &&
    Number.isFinite(selectedDay);

  const applyParts = (next) => {
    setParts(next);
    onPartsChange?.(next);
    const built = buildScheduledLocal(next);
    if (built) {
      onChange(built);
    }
  };

  const updatePart = (key, raw) => {
    let next = { ...parts, [key]: raw };

    if (key === "year" || key === "month") {
      const year = Number(next.year);
      const month = Number(next.month);
      const day = Number(next.day);
      if (next.day && Number.isFinite(year) && Number.isFinite(month)) {
        const maxDay = dayjs(
          `${year}-${String(month).padStart(2, "0")}-01`,
        ).daysInMonth();
        if (!Number.isFinite(day) || day > maxDay) {
          next = { ...next, day: "" };
        }
      }
      if (next.hour !== "" || next.minute !== "") {
        const hour = Number(next.hour);
        const minute = Number(next.minute);
        const dayNum = Number(next.day);
        if (
          Number.isFinite(year) &&
          Number.isFinite(month) &&
          Number.isFinite(dayNum) &&
          Number.isFinite(hour) &&
          Number.isFinite(minute) &&
          !isTimeSlotAllowed(
            year,
            month,
            dayNum,
            hour,
            minute,
            appointmentStartHm,
            appointmentEndHm,
          )
        ) {
          next = { ...next, hour: "", minute: "" };
        }
      }
    }

    if (key === "day") {
      const year = Number(next.year);
      const month = Number(next.month);
      const day = Number(next.day);
      const hour = Number(next.hour);
      const minute = Number(next.minute);
      if (
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        Number.isFinite(day) &&
        next.hour !== "" &&
        next.minute !== "" &&
        Number.isFinite(hour) &&
        Number.isFinite(minute) &&
        !isTimeSlotAllowed(
          year,
          month,
          day,
          hour,
          minute,
          appointmentStartHm,
          appointmentEndHm,
        )
      ) {
        next = { ...next, hour: "", minute: "" };
      }
    }

    applyParts(next);
  };

  const formatMinute = (minute) => String(minute).padStart(2, "0");

  const selectFieldProps = {
    size: "small",
    SelectProps: { MenuProps: SELECT_MENU_PROPS },
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <TextField
            {...selectFieldProps}
            select
            label="Year"
            value={parts.year}
            onChange={(e) => updatePart("year", e.target.value)}
            sx={{ flex: 1, minWidth: 108 }}
          >
            <MenuItem value="">
              <em>Select year</em>
            </MenuItem>
            {yearOptions.map((year) => (
              <MenuItem key={year} value={String(year)}>
                {year}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            {...selectFieldProps}
            select
            label="Month"
            value={parts.month}
            onChange={(e) => updatePart("month", e.target.value)}
            disabled={!parts.year}
            sx={{ flex: 1.4, minWidth: 132 }}
          >
            <MenuItem value="">
              <em>Select month</em>
            </MenuItem>
            {MONTHS.map((month) => (
              <MenuItem key={month.value} value={month.value}>
                {month.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            {...selectFieldProps}
            select
            label="Day"
            value={parts.day}
            onChange={(e) => updatePart("day", e.target.value)}
            disabled={!parts.year || !parts.month}
            sx={{ flex: 1, minWidth: 108 }}
          >
            <MenuItem value="">
              <em>Select day</em>
            </MenuItem>
            {dayOptions.map((day) => {
              const holiday = holidayOnDate(
                publicHolidays,
                selectedYear,
                selectedMonth,
                day,
              );
              const past = isPastDate(selectedYear, selectedMonth, day);
              const disabled = Boolean(holiday) || past;
              return (
                <MenuItem key={day} value={String(day)} disabled={disabled}>
                  {day}
                  {dayMenuSuffix(holiday, past)}
                </MenuItem>
              );
            })}
          </TextField>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap>
          <TextField
            {...selectFieldProps}
            select
            label="Hour"
            value={parts.hour}
            onChange={(e) => updatePart("hour", e.target.value)}
            disabled={!dateSelected}
            sx={{ flex: 1, minWidth: 108 }}
          >
            <MenuItem value="">
              <em>Select hour</em>
            </MenuItem>
            {Array.from({ length: 24 }, (_, hour) => {
              const selectable = isHourSelectable(
                selectedYear,
                selectedMonth,
                selectedDay,
                hour,
                appointmentStartHm,
                appointmentEndHm,
              );
              return (
                <MenuItem
                  key={hour}
                  value={String(hour)}
                  disabled={!selectable}
                >
                  {String(hour).padStart(2, "0")}
                  {!selectable ? " — Outside hours" : ""}
                </MenuItem>
              );
            })}
          </TextField>
          <TextField
            {...selectFieldProps}
            select
            label="Minute"
            value={parts.minute}
            onChange={(e) => updatePart("minute", e.target.value)}
            disabled={!dateSelected || parts.hour === ""}
            sx={{ flex: 1, minWidth: 108 }}
          >
            <MenuItem value="">
              <em>Select minute</em>
            </MenuItem>
            {minuteOptions.map((minute) => {
              const hour = Number(parts.hour);
              const selectable =
                Number.isFinite(hour) &&
                isTimeSlotAllowed(
                  selectedYear,
                  selectedMonth,
                  selectedDay,
                  hour,
                  minute,
                  appointmentStartHm,
                  appointmentEndHm,
                );
              return (
                <MenuItem
                  key={minute}
                  value={String(minute)}
                  disabled={!selectable}
                >
                  {formatMinute(minute)}
                  {!selectable ? " — Unavailable" : ""}
                </MenuItem>
              );
            })}
          </TextField>
        </Stack>
      </Stack>
      <FormHelperText sx={{ mx: 0, mt: 1 }}>
        Clinic operation hours: {appointmentHoursRangeLabel}. Public holidays and
        past dates are disabled. Same-day times in the past are unavailable.
      </FormHelperText>
      {hoursError ? (
        <FormHelperText error sx={{ mx: 0 }}>
          {hoursError}
        </FormHelperText>
      ) : null}
      {Number.isFinite(selectedYear) && Number.isFinite(selectedMonth) ? (
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mb: 0.75 }}
          >
            Public holidays in{" "}
            {dayjs(
              `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`,
            ).format("MMMM YYYY")}
          </Typography>
          {loadingHolidays ? (
            <Typography variant="body2" color="text.secondary">
              Loading holidays…
            </Typography>
          ) : monthHolidays.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No public holidays this month.
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {monthHolidays.map((holiday) => (
                <Typography key={holiday.id} variant="body2" color="text.secondary">
                  {formatHolidayDate(holiday.date)} — {holiday.name} (disabled)
                </Typography>
              ))}
            </Stack>
          )}
        </Box>
      ) : null}
    </Box>
  );
}
