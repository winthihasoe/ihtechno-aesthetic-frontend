import { useMemo } from "react";
import { Box } from "@mui/material";
import DepartmentSection from "./DepartmentSection";

export const UNASSIGNED_DEPARTMENT = {
  id: null,
  name: "Unassigned",
};

const departmentMapKey = (departmentId) =>
  departmentId == null || departmentId === "" ? "unassigned" : String(departmentId);

export default function DepartmentBoard({
  departments = [],
  staff = [],
  onCardClick,
  departmentFilter = "all",
  hideEmptySections = false,
}) {
  const staffByDepartmentId = useMemo(() => {
    const map = new Map();
    staff.forEach((member) => {
      const profile = member.staff_profile;
      const departmentId = profile?.department_id ?? profile?.department?.id ?? null;
      const key = departmentMapKey(departmentId);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(member);
    });
    for (const [, members] of map) {
      members.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [staff]);

  const sections = useMemo(() => {
    const sortedDepartments = [...departments].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
    );

    const allSections = [
      ...sortedDepartments.map((department) => ({
        id: department.id,
        name: department.name,
      })),
      UNASSIGNED_DEPARTMENT,
    ];

    if (departmentFilter !== "all") {
      const match = allSections.find((section) => departmentMapKey(section.id) === String(departmentFilter));
      return match ? [match] : [];
    }

    return allSections;
  }, [departments, departmentFilter]);

  const visibleSections = useMemo(() => {
    if (!hideEmptySections) {
      return sections;
    }
    return sections.filter((section) => (staffByDepartmentId.get(departmentMapKey(section.id)) ?? []).length > 0);
  }, [sections, staffByDepartmentId, hideEmptySections]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {visibleSections.map((section) => {
        const key = departmentMapKey(section.id);
        const sectionStaff = staffByDepartmentId.get(key) ?? [];
        return (
          <DepartmentSection
            key={key}
            departmentId={section.id}
            title={section.name}
            staff={sectionStaff}
            onCardClick={onCardClick}
          />
        );
      })}
    </Box>
  );
}
