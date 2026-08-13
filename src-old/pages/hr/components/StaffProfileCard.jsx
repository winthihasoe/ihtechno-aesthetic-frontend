import { Avatar, Box, Card, CardActionArea, Typography } from "@mui/material";
import StaffProfileStatusChips from "./StaffProfileStatusChips";

export default function StaffProfileCard({ staff, onClick }) {
  const position = staff.staff_profile?.position_title || "No position";
  const profile = staff.staff_profile;

  return (
    <Card
      variant="outlined"
      data-testid={`staff-card-${staff.id}`}
      sx={{
        borderRadius: 1,
        height: "100%",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover": {
          boxShadow: 2,
          borderColor: "primary.light",
        },
      }}
    >
      <CardActionArea
        onClick={() => onClick(staff)}
        sx={{ height: "100%", p: 2 }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            textAlign: "center",
            gap: 1,
            position: "relative",
          }}
        >
          <Avatar
            src={staff.staff_profile?.avatar_url || undefined}
            alt={staff.name}
            sx={{ width: 64, height: 64 }}
          />
          <Box sx={{ minWidth: 0, width: "100%" }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              noWrap
              textAlign={"left"}
              title={staff.name}
            >
              {staff.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", textAlign: "left" }}
              noWrap
              title={position}
            >
              {position}
            </Typography>
            {profile ? (
              <StaffProfileStatusChips
                profileStatus={profile.profile_status}
                profileStatusLabel={profile.profile_status_label}
                statusReminder={profile.status_reminder}
                statusReminderLabel={profile.status_reminder_label}
                hireDate={profile.hire_date}
                probationMonths={profile.probation_months}
                resignationPeriodEndDate={profile.resignation_period_end_date}
                probationEndDate={profile.probation_end_date}
              />
            ) : null}
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}
