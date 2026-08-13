import { describe, it, expect } from "vitest";
import {
  canAccessWorkspace,
  resolveNavTemplateKey,
} from "../roleWorkspace";

describe("resolveNavTemplateKey", () => {
  it("maps ceo to owner template", () => {
    expect(resolveNavTemplateKey({ role: "ceo", permissions: [] })).toBe("owner");
  });

  it("maps senior_nurse to medical_officer template", () => {
    expect(
      resolveNavTemplateKey({ role: "senior_nurse", permissions: ["consultations.manage"] }),
    ).toBe("medical_officer");
  });

  it("maps specialist to therapist template", () => {
    expect(
      resolveNavTemplateKey({ role: "specialist", permissions: ["treatments.manage"] }),
    ).toBe("therapist");
  });

  it("falls back from permissions for unknown custom role", () => {
    expect(
      resolveNavTemplateKey({
        role: "custom_role",
        permissions: ["consultations.manage", "liveboard.view"],
      }),
    ).toBe("medical_officer");
  });
});

describe("canAccessWorkspace", () => {
  it("allows senior_nurse into medical_officer workspace", () => {
    expect(
      canAccessWorkspace(
        { role: "senior_nurse", permissions: ["consultations.manage"] },
        "medical_officer",
      ),
    ).toBe(true);
  });

  it("allows manager into admin workspace", () => {
    expect(
      canAccessWorkspace({ role: "manager", permissions: ["users.manage"] }, "admin"),
    ).toBe(true);
  });

  it("denies worker from owner workspace", () => {
    expect(
      canAccessWorkspace({ role: "worker", permissions: ["liveboard.view"] }, "owner"),
    ).toBe(false);
  });
});
