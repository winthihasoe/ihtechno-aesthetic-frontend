import { Box, Chip, Divider, Typography } from "@mui/material";
import StaffProfileCard from "./StaffProfileCard";

export default function DepartmentSection({
  departmentId,
  title,
  staff = [],
  onCardClick,
}) {
  const sectionKey = departmentId ?? "unassigned";

  return (
    <Box
      component="section"
      data-testid={`department-section-${sectionKey}`}
      sx={{ mb: 3 }}
    >
      <Box
        sx={{
          display: "flex",

          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
          {title}
        </Typography>
        <Chip
          size="small"
          label={`${staff.length} ${staff.length === 1 ? "person" : "people"}`}
          variant="outlined"
        />
      </Box>
      <Divider sx={{ mb: 2 }} />
      {staff.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          No staff in this department.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
              lg: "repeat(5, minmax(0, 1fr))",
            },
            gap: 1.5,
          }}
        >
          {staff.map((member) => (
            <StaffProfileCard
              key={member.id}
              staff={member}
              onClick={onCardClick}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
