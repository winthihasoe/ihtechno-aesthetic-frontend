import { Stack, Switch, TextField, Typography } from "@mui/material";
import HrFormSection from "./HrFormSection";

export default function StaffScheduleSection({
  scheduleRows = [],
  onChangeScheduleRows,
  weekdayOptions = [],
}) {
  const patchScheduleRow = (weekday, patch) => {
    onChangeScheduleRows((prev) =>
      prev.map((item) =>
        item.weekday === weekday ? { ...item, ...patch } : item,
      ),
    );
  };

  return (
    <HrFormSection
      title="Weekly schedule"
      description="Shift times for attendance. Saved together with profile changes below."
      showDivider={false}
    >
      {scheduleRows.map((row) => (
        <Stack
          key={row.weekday}
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ md: "center" }}
        >
          <Typography variant="body2" sx={{ minWidth: 60 }}>
            {weekdayOptions.find((item) => item.value === row.weekday)?.label}
          </Typography>
          <TextField
            type="time"
            size="small"
            label="Start"
            InputLabelProps={{ shrink: true }}
            value={row.start_time}
            disabled={row.is_day_off}
            onChange={(e) =>
              patchScheduleRow(row.weekday, { start_time: e.target.value })
            }
          />
          <TextField
            type="time"
            size="small"
            label="End"
            InputLabelProps={{ shrink: true }}
            value={row.end_time}
            disabled={row.is_day_off}
            onChange={(e) =>
              patchScheduleRow(row.weekday, { end_time: e.target.value })
            }
          />
          <TextField
            type="number"
            size="small"
            label="Grace min"
            value={row.grace_minutes}
            onChange={(e) =>
              patchScheduleRow(row.weekday, {
                grace_minutes: Number(e.target.value || 0),
              })
            }
            sx={{ maxWidth: 120 }}
          />
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption">Day off</Typography>
            <Switch
              checked={row.is_day_off}
              onChange={(e) =>
                patchScheduleRow(row.weekday, {
                  is_day_off: e.target.checked,
                })
              }
            />
          </Stack>
        </Stack>
      ))}
    </HrFormSection>
  );
}
