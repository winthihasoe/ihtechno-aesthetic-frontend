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

  // Prevent "Products" from being active on dedicated inventory sibling routes.
  if (itemPath.endsWith("/inventory")) {
    if (p === itemPath) return true;

    const inventorySiblings = [
      "suppliers",
      "treatment-template",
      "treatment-templates",
      "stock-movements",
      "consignment-report",
      "consignment-settlement",
      "batch-recalls",
      "equipment-consumables",
      "supplier-returns",
    ];
    if (
      inventorySiblings.some((segment) =>
        p.startsWith(`${itemPath}/${segment}`),
      )
    ) {
      return false;
    }

    const inventoryPrefix = `${itemPath}/`;
    const isInventoryChild = p.startsWith(inventoryPrefix);
    const hasSingleChildSegment =
      p.slice(inventoryPrefix.length).split("/").length === 1;
    return isInventoryChild && hasSingleChildSegment;
  }

  if (itemPath.endsWith("/hr/daily/leaves")) {
    const leaveRulesPath = itemPath.replace("/daily/leaves", "/leave-rules");
    return (
      p === itemPath ||
      p.startsWith(`${itemPath}/`) ||
      p === leaveRulesPath ||
      p.startsWith(`${leaveRulesPath}/`)
    );
  }

  if (p === itemPath) return true;
  return p.startsWith(`${itemPath}/`);
}
