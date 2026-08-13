/**
 * Sidebar active state: avoid highlighting parent routes when a more specific
 * sibling is a better match (e.g. /inventory vs /inventory/suppliers).
 *
 * @param {string} pathname - location.pathname
 * @param {string} itemPath - nav item `to` path
 * @returns {boolean}
 */
export function isSidebarNavItemActive(pathname, itemPath) {
  const p = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

  // Consignment settlement is reached from the report; keep this nav highlight on both URLs.
  if (itemPath.endsWith("/inventory/consignment-report")) {
    const settlementPath = itemPath.replace(
      /\/consignment-report$/,
      "/consignment-settlement",
    );
    return (
      p === itemPath ||
      p.startsWith(`${itemPath}/`) ||
      p === settlementPath ||
      p.startsWith(`${settlementPath}/`)
    );
  }

  // Prevent "Products" from being active on sibling routes like
  // ".../inventory/suppliers", ".../inventory/alerts", and
  // ".../inventory/treatment-templates".
  if (itemPath.endsWith("/inventory")) {
    if (p === itemPath) return true;
    if (p.startsWith(`${itemPath}/alerts`)) return false;
    if (p.startsWith(`${itemPath}/suppliers`)) return false;
    if (p.startsWith(`${itemPath}/treatment-template`)) return false;
    if (p.startsWith(`${itemPath}/treatment-templates`)) return false;
    if (p.startsWith(`${itemPath}/stock-movements`)) return false;
    if (p.startsWith(`${itemPath}/consignment-report`)) return false;
    if (p.startsWith(`${itemPath}/consignment-settlement`)) return false;
    const inventoryPrefix = `${itemPath}/`;
    const isInventoryChild = p.startsWith(inventoryPrefix);
    const hasSingleChildSegment =
      p.slice(inventoryPrefix.length).split("/").length === 1;
    return isInventoryChild && hasSingleChildSegment;
  }

  if (p === itemPath) return true;
  return p.startsWith(`${itemPath}/`);
}
