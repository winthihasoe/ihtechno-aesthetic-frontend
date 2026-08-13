import { describe, it, expect } from "vitest";
import {
  getNavSections,
  resolveActiveSection,
  getMobilePrimaryItems,
} from "../navSections";

describe("getNavSections", () => {
  it("returns owner finance section with multiple children", () => {
    const sections = getNavSections({
      role: "owner",
      roles: [{ slug: "owner" }],
      permissions: [],
    });
    const finance = sections.find((s) => s.id === "finance");
    expect(finance).toBeDefined();
    expect(finance.children.length).toBeGreaterThanOrEqual(7);
    expect(finance.children.some((c) => c.path.includes("/owner/finance/"))).toBe(
      true,
    );
  });

  it("splits admin inventory and billing", () => {
    const sections = getNavSections({
      role: "owner",
      roles: [{ slug: "owner" }],
      permissions: [],
    });
    const adminLike = sections.filter((s) =>
      s.children?.some((c) => c.path?.startsWith("/owner/")),
    );
    expect(adminLike.length).toBeGreaterThan(0);
    expect(sections.some((s) => s.id === "inventory")).toBe(true);
    expect(sections.some((s) => s.id === "billing")).toBe(true);
    expect(
      sections.some((s) => s.label === "Inventory & Transaction Management"),
    ).toBe(false);
  });

  it("groups cashier into billing and inventory sections", () => {
    const sections = getNavSections({
      role: "cashier",
      roles: [{ slug: "cashier" }],
      permissions: ["patients.view", "inventory.view", "payments.view"],
    });
    expect(sections.some((s) => s.id === "billing")).toBe(true);
    expect(sections.some((s) => s.id === "inventory")).toBe(true);
    expect(sections.some((s) => s.id === "finance")).toBe(true);
  });
});

describe("resolveActiveSection", () => {
  it("selects finance for owner finance deep links", () => {
    const sections = getNavSections({
      role: "owner",
      roles: [{ slug: "owner" }],
      permissions: [],
    });
    const active = resolveActiveSection(
      "/owner/finance/general-ledger",
      sections,
    );
    expect(active?.id).toBe("finance");
  });

  it("selects billing for owner invoice detail", () => {
    const sections = getNavSections({
      role: "owner",
      roles: [{ slug: "owner" }],
      permissions: [],
    });
    expect(resolveActiveSection("/owner/invoices/42", sections)?.id).toBe(
      "billing",
    );
    expect(resolveActiveSection("/owner/payments/42", sections)?.id).toBe(
      "billing",
    );
  });

  it("selects billing for cashier invoice detail", () => {
    const sections = getNavSections({
      role: "cashier",
      roles: [{ slug: "cashier" }],
      permissions: ["patients.view", "inventory.view", "payments.view"],
    });
    expect(
      resolveActiveSection("/cashier/payments/99", sections)?.id,
    ).toBe("billing");
  });
});

describe("getMobilePrimaryItems", () => {
  it("respects mobilePriority for reception", () => {
    const sections = getNavSections({
      role: "reception",
      roles: [{ slug: "reception" }],
      permissions: [
        "liveboard.view",
        "appointments.view",
        "patients.view",
      ],
    });
    const primary = getMobilePrimaryItems(sections, 3);
    expect(primary.map((s) => s.id)).toEqual([
      "patients",
      "visit_history",
      "appointments",
    ]);
  });
});
