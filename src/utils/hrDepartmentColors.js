/** Prominent, readable department colors (avoid pale success/warning greens & yellows). */

const DEPARTMENT_COLORS = {
  management: {
    accent: "#6A1B9A",
    chipBg: "#F3E5F5",
    chipText: "#4A148C",
  },
  hr: {
    accent: "#1565C0",
    chipBg: "#E3F2FD",
    chipText: "#0D47A1",
  },
  operation: {
    accent: "#00838F",
    chipBg: "#E0F7FA",
    chipText: "#006064",
  },
  sales: {
    accent: "#E65100",
    chipBg: "#FFF3E0",
    chipText: "#BF360C",
  },
  accounting: {
    accent: "#283593",
    chipBg: "#E8EAF6",
    chipText: "#1A237E",
  },
  unassigned: {
    accent: "#546E7A",
    chipBg: "#ECEFF1",
    chipText: "#37474F",
  },
};

const FALLBACK_COLORS = [
  { accent: "#C62828", chipBg: "#FFEBEE", chipText: "#B71C1C" },
  { accent: "#AD1457", chipBg: "#FCE4EC", chipText: "#880E4F" },
  { accent: "#4527A0", chipBg: "#EDE7F6", chipText: "#311B92" },
  { accent: "#0277BD", chipBg: "#E1F5FE", chipText: "#01579B" },
];

const normalizeKey = (departmentName) => {
  const label = (departmentName || "").trim().toLowerCase();
  if (!label || label === "unassigned") return "unassigned";
  if (label.includes("management") || label.includes("administration")) return "management";
  if (label === "hr" || label.includes("human resource") || label.includes("nursing")) {
    return "hr";
  }
  if (
    label.includes("operation") ||
    label.includes("outpatient") ||
    label.includes("(opd)")
  ) {
    return "operation";
  }
  if (label.includes("laboratory") || label.includes("lab")) return "accounting";
  if (label.includes("pharmacy")) return "sales";
  if (label.includes("sales") || label.includes("marketing")) return "sales";
  if (
    label.includes("account") ||
    label.includes("finance") ||
    label.includes("financial")
  ) {
    return "accounting";
  }
  return null;
};

/**
 * @param {string} [departmentName]
 * @returns {{ accent: string, chipBg: string, chipText: string }}
 */
export function getDepartmentColor(departmentName) {
  const mapped = normalizeKey(departmentName);
  if (mapped && DEPARTMENT_COLORS[mapped]) {
    return DEPARTMENT_COLORS[mapped];
  }

  const label = (departmentName || "Other").trim();
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash + label.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}
