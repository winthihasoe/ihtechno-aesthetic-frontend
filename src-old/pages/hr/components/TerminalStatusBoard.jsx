import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import DepartmentSection from "./DepartmentSection";
import {
  PROFILE_STATUS_LABELS,
  TERMINAL_PROFILE_STATUSES,
} from "./staffProfileStatusHelpers";

const TERMINAL_SECTION_ORDER = ["terminated", "dismissed", "resigned"];

export default function TerminalStatusBoard({
  staff = [],
  onCardClick,
  hideEmptySections = false,
}) {
  const staffByStatus = useMemo(() => {
    const map = new Map();
    TERMINAL_SECTION_ORDER.forEach((status) => map.set(status, []));

    staff.forEach((member) => {
      const status = member.staff_profile?.profile_status;
      if (!TERMINAL_PROFILE_STATUSES.includes(status)) return;
      if (!map.has(status)) map.set(status, []);
      map.get(status).push(member);
    });

    for (const [, members] of map) {
      members.sort((a, b) => a.name.localeCompare(b.name));
    }

    return map;
  }, [staff]);

  const sections = useMemo(() => {
    const all = TERMINAL_SECTION_ORDER.map((status) => ({
      status,
      title: PROFILE_STATUS_LABELS[status] || status,
      staff: staffByStatus.get(status) ?? [],
    }));

    if (!hideEmptySections) return all;
    return all.filter((section) => section.staff.length > 0);
  }, [staffByStatus, hideEmptySections]);

  if (!sections.length) return null;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Former staff
      </Typography>
      {sections.map((section) => (
        <DepartmentSection
          key={section.status}
          departmentId={section.status}
          title={section.title}
          staff={section.staff}
          onCardClick={onCardClick}
        />
      ))}
    </Box>
  );
}
