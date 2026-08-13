import { Position } from "@xyflow/react";

export const VIRTUAL_ROOT_ID = "org-root";
const NODE_WIDTH = 228;
const NODE_HEIGHT = 108;
const HORIZONTAL_GAP = 56;
const VERTICAL_GAP = 96;

import { getDepartmentColor } from "./hrDepartmentColors";

const isDeveloperAccount = (user) =>
  user?.role === "developer" ||
  (user?.roles || []).some((role) => role?.slug === "developer");

export const staffNodeId = (userId) => `staff-${userId}`;

const createSyntheticManager = (manager) => ({
  id: Number(manager.id),
  name: manager.name,
  staff_profile: {
    position_title: "Leadership",
    department: { name: "Management" },
    avatar_url: null,
  },
  isSyntheticManager: true,
});

const collectHierarchyMemberIds = (withProfile, rawManagerByStaffId, staffById) => {
  const inTree = new Set();

  const walkUp = (staffId) => {
    if (inTree.has(staffId)) return;
    inTree.add(staffId);
    const managerId = rawManagerByStaffId.get(staffId);
    if (managerId != null && staffById.has(managerId)) {
      walkUp(managerId);
    }
  };

  const walkDown = (staffId) => {
    withProfile.forEach((member) => {
      const memberId = Number(member.id);
      if (Number(member.staff_profile?.reporting_manager_id) === staffId) {
        if (!inTree.has(memberId)) {
          inTree.add(memberId);
          walkDown(memberId);
        }
      }
    });
  };

  withProfile.forEach((member) => {
    if (member.staff_profile?.reporting_manager_id != null) {
      walkUp(Number(member.id));
    }
  });

  [...inTree].forEach((staffId) => walkDown(staffId));

  return inTree;
};

/**
 * @param {Array<Record<string, unknown>>} staffList
 * @param {{ organizationLabel?: string }} [options]
 */
export function buildOrgTreeData(staffList, options = {}) {
  const organizationLabel = options.organizationLabel || "Organization";
  const withProfile = (staffList || []).filter(
    (member) => !isDeveloperAccount(member) && member.staff_profile,
  );

  if (!withProfile.length) {
    return {
      nodes: [],
      edges: [],
      hasReportingLines: false,
      staffCount: 0,
    };
  }

  const staffById = new Map(withProfile.map((member) => [Number(member.id), member]));

  const rawManagerByStaffId = new Map();
  withProfile.forEach((member) => {
    const managerId = member.staff_profile?.reporting_manager_id;
    if (managerId != null) {
      rawManagerByStaffId.set(Number(member.id), Number(managerId));
    }
  });

  const hasReportingLines = rawManagerByStaffId.size > 0;

  if (!hasReportingLines) {
    return {
      nodes: [],
      edges: [],
      hasReportingLines: false,
      staffCount: withProfile.length,
    };
  }

  withProfile.forEach((member) => {
    const manager = member.staff_profile?.reporting_manager;
    if (manager?.id && !staffById.has(Number(manager.id))) {
      staffById.set(Number(manager.id), createSyntheticManager(manager));
    }
  });

  const resolveManagerId = (staffId) => {
    const managerId = rawManagerByStaffId.get(staffId) ?? null;
    if (managerId == null || managerId === staffId || !staffById.has(managerId)) {
      return null;
    }
    const visited = new Set([staffId]);
    let cursor = managerId;
    while (cursor != null) {
      if (visited.has(cursor)) {
        return null;
      }
      visited.add(cursor);
      const next = rawManagerByStaffId.get(cursor) ?? null;
      if (next != null && !staffById.has(next)) {
        break;
      }
      cursor = next;
    }
    return managerId;
  };

  const managerByStaffId = new Map();
  withProfile.forEach((member) => {
    managerByStaffId.set(Number(member.id), resolveManagerId(Number(member.id)));
  });

  const hierarchyIds = collectHierarchyMemberIds(withProfile, rawManagerByStaffId, staffById);

  rawManagerByStaffId.forEach((_managerId, staffId) => {
    let cursor = staffId;
    const visited = new Set();
    while (cursor != null && !visited.has(cursor)) {
      visited.add(cursor);
      hierarchyIds.add(cursor);
      const resolvedManager = managerByStaffId.get(cursor);
      if (resolvedManager == null) break;
      hierarchyIds.add(resolvedManager);
      cursor = resolvedManager;
    }
  });

  const chartMembers = [...hierarchyIds]
    .map((id) => staffById.get(id))
    .filter(Boolean);

  const nodes = [];
  const edges = [];

  chartMembers.forEach((member) => {
    const staffId = Number(member.id);
    const departmentName = member.staff_profile?.department?.name || "Management";
    nodes.push({
      id: staffNodeId(staffId),
      type: "orgChart",
      data: {
        staff: member,
        departmentName,
        departmentColor: getDepartmentColor(departmentName),
        isSyntheticManager: Boolean(member.isSyntheticManager),
      },
      position: { x: 0, y: 0 },
    });

    const managerId = managerByStaffId.get(staffId);
    if (managerId != null && hierarchyIds.has(managerId)) {
      edges.push({
        id: `${staffNodeId(managerId)}-${staffNodeId(staffId)}`,
        source: staffNodeId(managerId),
        target: staffNodeId(staffId),
        type: "smoothstep",
      });
    }
  });

  const rootIds = chartMembers
    .map((member) => Number(member.id))
    .filter((staffId) => {
      const managerId = managerByStaffId.get(staffId);
      return managerId == null || !hierarchyIds.has(managerId);
    });

  const useVirtualRoot = rootIds.length > 1;

  if (useVirtualRoot) {
    nodes.unshift({
      id: VIRTUAL_ROOT_ID,
      type: "orgChart",
      data: {
        isVirtual: true,
        label: organizationLabel,
      },
      position: { x: 0, y: 0 },
      draggable: false,
      selectable: false,
    });

    rootIds.forEach((staffId) => {
      edges.push({
        id: `${VIRTUAL_ROOT_ID}-${staffNodeId(staffId)}`,
        source: VIRTUAL_ROOT_ID,
        target: staffNodeId(staffId),
        type: "smoothstep",
      });
    });
  }

  const layouted = layoutOrgTreeCentered(nodes, edges);

  return {
    nodes: layouted.nodes,
    edges: layouted.edges,
    hasReportingLines,
    staffCount: withProfile.length,
    chartMemberCount: chartMembers.length,
  };
}

function buildChildrenMap(nodes, edges) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenMap = new Map();

  nodes.forEach((node) => {
    childrenMap.set(node.id, []);
  });

  edges.forEach((edge) => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source).push(edge.target);
  });

  childrenMap.forEach((children, parentId) => {
    children.sort((a, b) => {
      const nameA = nodeById.get(a)?.data?.staff?.name || nodeById.get(a)?.data?.label || "";
      const nameB = nodeById.get(b)?.data?.staff?.name || nodeById.get(b)?.data?.label || "";
      return nameA.localeCompare(nameB);
    });
  });

  return childrenMap;
}

function measureSubtreeWidth(nodeId, childrenMap) {
  const children = childrenMap.get(nodeId) || [];
  if (!children.length) {
    return NODE_WIDTH + HORIZONTAL_GAP;
  }
  return children.reduce(
    (total, childId) => total + measureSubtreeWidth(childId, childrenMap),
    0,
  );
}

function assignCenteredPositions(nodeId, childrenMap, leftX, depth, positions) {
  const children = childrenMap.get(nodeId) || [];
  const subtreeWidth = measureSubtreeWidth(nodeId, childrenMap);
  const centerX = leftX + subtreeWidth / 2;

  positions.set(nodeId, {
    x: centerX - NODE_WIDTH / 2,
    y: depth * (NODE_HEIGHT + VERTICAL_GAP),
  });

  let childLeft = leftX;
  children.forEach((childId) => {
    const childWidth = measureSubtreeWidth(childId, childrenMap);
    assignCenteredPositions(childId, childrenMap, childLeft, depth + 1, positions);
    childLeft += childWidth;
  });
}

function layoutOrgTreeCentered(nodes, edges) {
  if (!nodes.length) {
    return { nodes: [], edges: [] };
  }

  const childrenMap = buildChildrenMap(nodes, edges);
  const childTargets = new Set(edges.map((edge) => edge.target));
  const roots = nodes
    .filter((node) => !childTargets.has(node.id))
    .map((node) => node.id)
    .sort((a, b) => {
      if (a === VIRTUAL_ROOT_ID) return -1;
      if (b === VIRTUAL_ROOT_ID) return 1;
      return a.localeCompare(b);
    });

  const positions = new Map();
  let cursorX = 0;

  roots.forEach((rootId) => {
    const width = measureSubtreeWidth(rootId, childrenMap);
    assignCenteredPositions(rootId, childrenMap, cursorX, 0, positions);
    cursorX += width + HORIZONTAL_GAP;
  });

  const layoutedNodes = nodes.map((node) => {
    const position = positions.get(node.id) ?? { x: 0, y: 0 };
    return {
      ...node,
      position,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
    };
  });

  return { nodes: layoutedNodes, edges };
}

export { NODE_WIDTH, NODE_HEIGHT };
