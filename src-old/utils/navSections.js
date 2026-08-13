import { getNavItems } from "./roleUtils";
import { isSidebarNavItemActive } from "./sidebarNavActive";
import { isInvoiceDetailPathname } from "./workspaceRoutes";

const slugify = (label) =>
  String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

/**
 * @param {import("./roleUtils").NavItem} item
 * @returns {import("./roleUtils").NavSection}
 */
const toSection = (item) => {
  if (item.children?.length) {
    return {
      ...item,
      id: item.id ?? slugify(item.label),
    };
  }

  const { children: _c, ...leaf } = item;
  return {
    id: item.id ?? slugify(item.label),
    label: item.label,
    path: item.path,
    icon: item.icon,
    roles: item.roles,
    permissions: item.permissions,
    mobilePriority: item.mobilePriority,
    children: [leaf],
  };
};

/**
 * @param {object | null | undefined} user
 * @returns {import("./roleUtils").NavSection[]}
 */
export const getNavSections = (user) => getNavItems(user).map(toSection);

/**
 * @param {string} pathname
 * @param {import("./roleUtils").NavSection[]} sections
 * @returns {import("./roleUtils").NavSection | null}
 */
export const resolveActiveSection = (pathname, sections) => {
  if (!sections.length) return null;

  const normalized =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;

  for (const section of sections) {
    const children = section.children ?? [];
    if (
      children.some((child) => isSidebarNavItemActive(normalized, child.path))
    ) {
      return section;
    }
    if (section.path && isSidebarNavItemActive(normalized, section.path)) {
      return section;
    }
    if (
      section.id === "finance" &&
      /\/(?:owner|admin|accountant|cashier)\/finance(\/|$)/.test(normalized) &&
      children.length > 0
    ) {
      return section;
    }
    // Invoice detail (e.g. /owner/payments/:id, /cashier/payments/:id) → Billing and payables
    if (
      section.id === "billing" &&
      isInvoiceDetailPathname(normalized) &&
      children.length > 0
    ) {
      return section;
    }
  }

  return sections[0];
};

/**
 * Primary items for mobile bottom nav (up to `limit` sections).
 * @param {import("./roleUtils").NavSection[]} sections
 * @param {number} [limit=3]
 */
export const getMobilePrimaryItems = (sections, limit = 3) => {
  const prioritized = sections
    .filter((s) => s.mobilePriority != null)
    .sort((a, b) => (a.mobilePriority ?? 99) - (b.mobilePriority ?? 99));

  if (prioritized.length >= limit) {
    return prioritized.slice(0, limit);
  }

  const rest = sections.filter((s) => !prioritized.includes(s));
  return [...prioritized, ...rest].slice(0, limit);
};

/**
 * Sections not included in the mobile primary strip (shown under "More").
 * @param {import("./roleUtils").NavSection[]} sections
 * @param {import("./roleUtils").NavSection[]} primary
 */
export const getMobileMoreSections = (sections, primary) =>
  sections.filter((s) => !primary.includes(s));
