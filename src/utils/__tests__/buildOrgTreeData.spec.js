import { describe, expect, it } from "vitest";
import {
  buildOrgTreeData,
  staffNodeId,
  VIRTUAL_ROOT_ID,
} from "../buildOrgTreeData";

const makeStaff = (id, name, managerId = null, departmentName = "HR", reportingManager = null) => ({
  id,
  name,
  staff_profile: {
    position_title: `${name} Role`,
    reporting_manager_id: managerId,
    reporting_manager:
      reportingManager ?? (managerId ? { id: managerId, name: `Manager ${managerId}` } : null),
    department: { name: departmentName },
  },
});

describe("buildOrgTreeData", () => {
  it("returns empty graph when no staff", () => {
    const result = buildOrgTreeData([]);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.hasReportingLines).toBe(false);
    expect(result.staffCount).toBe(0);
  });

  it("ignores users without staff profiles and reports no lines when unset", () => {
    const result = buildOrgTreeData([
      makeStaff(1, "Alice"),
      makeStaff(2, "Bob"),
      { id: 3, name: "No Profile User" },
    ]);

    expect(result.hasReportingLines).toBe(false);
    expect(result.nodes).toEqual([]);
    expect(result.staffCount).toBe(2);
  });

  it("builds manager edges for a single reporting chain", () => {
    const result = buildOrgTreeData([
      makeStaff(1, "CEO"),
      makeStaff(2, "Manager", 1),
      makeStaff(3, "Staff", 2),
      makeStaff(4, "Unrelated"),
    ]);

    expect(result.hasReportingLines).toBe(true);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.some((node) => node.id === staffNodeId(4))).toBe(false);
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: staffNodeId(1), target: staffNodeId(2) }),
        expect.objectContaining({ source: staffNodeId(2), target: staffNodeId(3) }),
      ]),
    );
    expect(result.nodes.some((node) => node.id === VIRTUAL_ROOT_ID)).toBe(false);
  });

  it("includes external managers such as clinic owner without a staff profile", () => {
    const result = buildOrgTreeData([
      makeStaff(2, "HR Manager", 99, "HR", { id: 99, name: "Clinic Owner" }),
      makeStaff(3, "Reception", 2),
    ]);

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.some((node) => node.id === staffNodeId(99))).toBe(true);
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: staffNodeId(99), target: staffNodeId(2) }),
        expect.objectContaining({ source: staffNodeId(2), target: staffNodeId(3) }),
      ]),
    );
    expect(result.nodes.some((node) => node.id === VIRTUAL_ROOT_ID)).toBe(false);
  });

  it("centers parent above spread children", () => {
    const result = buildOrgTreeData([
      makeStaff(1, "CEO"),
      makeStaff(2, "Manager A", 1),
      makeStaff(3, "Manager B", 1),
      makeStaff(4, "Staff A1", 2),
      makeStaff(5, "Staff A2", 2),
    ]);

    const node = (id) => result.nodes.find((item) => item.id === staffNodeId(id));
    const centerX = (id) => node(id).position.x + 114;

    const minX = Math.min(...result.nodes.map((item) => item.position.x));
    const maxX = Math.max(...result.nodes.map((item) => item.position.x + 228));
    expect(centerX(1)).toBeCloseTo((minX + maxX) / 2, 0);
    expect(centerX(2)).toBeCloseTo((centerX(4) + centerX(5)) / 2, 0);
  });

  it("breaks cycles by treating cyclic staff as roots", () => {
    const result = buildOrgTreeData([makeStaff(1, "A", 2), makeStaff(2, "B", 1)]);

    expect(result.hasReportingLines).toBe(true);
    expect(result.edges.some((edge) => edge.source === staffNodeId(1) && edge.target === staffNodeId(2))).toBe(
      false,
    );
    expect(result.edges.some((edge) => edge.source === staffNodeId(2) && edge.target === staffNodeId(1))).toBe(
      false,
    );
    expect(result.nodes.some((node) => node.id === VIRTUAL_ROOT_ID)).toBe(true);
  });
});
