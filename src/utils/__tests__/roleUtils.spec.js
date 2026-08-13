import { describe, it, expect } from "vitest";
import {
  canAccessPreparationPanel,
  canDo,
  canUseLiveboardButton,
  DEFAULT_LIVEBOARD_RULES,
  canManageConsultationForVisit,
  canStartConsultationForVisit,
  canOpenVisitPanel,
  canAccessTreatmentRoom,
  canEditProcedureRecordOnVisit,
  hasAssignedTreatmentDoctorSession,
  isPendingDoctorHandoverReceiver,
  canHandoverCheckIn,
  getNavItems,
  ROLE_ACTIONS,
} from "../../utils/roleUtils";

describe("canDo", () => {
  it("returns true when the role has the action", () => {
    expect(canDo("medical_officer", "start_consultation")).toBe(true);
    expect(canDo("dermatologist", "start_consultation")).toBe(true);
  });

  it("returns false when the role does not have the action", () => {
    expect(canDo("cashier", "start_consultation")).toBe(false);
  });

  it("returns false for an unknown role", () => {
    expect(canDo("nurse", "start_consultation")).toBe(false);
  });

  it("returns false when role is null", () => {
    expect(canDo(null, "start_consultation")).toBe(false);
  });

  it("admin can perform every defined action", () => {
    const allActions = [...new Set(Object.values(ROLE_ACTIONS).flat())];
    allActions.forEach((action) => {
      expect(canDo("admin", action)).toBe(true);
    });
  });
});

const liveboardPerms = ["liveboard.view", "liveboard.update"];

describe("canStartConsultationForVisit", () => {
  it("is true for the assigned doctor", () => {
    const user = { id: 5, role: "medical_officer", permissions: liveboardPerms };
    const visit = { doctor_id: 5, status: "waiting" };
    expect(canStartConsultationForVisit(user, visit)).toBe(true);
  });

  it("is false when another doctor is assigned", () => {
    const user = { id: 5, role: "medical_officer", permissions: liveboardPerms };
    const visit = { doctor_id: 9, status: "waiting" };
    expect(canStartConsultationForVisit(user, visit)).toBe(false);
  });

  it("is false when no doctor is assigned yet", () => {
    const user = { id: 5, role: "medical_officer", permissions: liveboardPerms };
    const visit = { doctor_id: null, status: "waiting" };
    expect(canStartConsultationForVisit(user, visit)).toBe(false);
  });

  it("is true for admin regardless of assignee", () => {
    const user = { id: 1, role: "admin", permissions: liveboardPerms };
    const visit = { doctor_id: 99, status: "waiting" };
    expect(canStartConsultationForVisit(user, visit)).toBe(true);
  });
});

describe("canManageConsultationForVisit", () => {
  it("allows assigned doctor", () => {
    const user = { id: 5, role: "medical_officer", permissions: liveboardPerms };
    const visit = { doctor_id: 5, status: "consulting" };
    expect(canManageConsultationForVisit(user, visit)).toBe(true);
  });

  it("allows assigned dermatologist", () => {
    const user = { id: 9, role: "dermatologist", permissions: liveboardPerms };
    const visit = { doctor_id: 9, status: "consulting" };
    expect(canManageConsultationForVisit(user, visit)).toBe(true);
  });

  it("denies non-assigned doctor", () => {
    const user = { id: 5, role: "medical_officer", permissions: liveboardPerms };
    const visit = { doctor_id: 9, status: "consulting" };
    expect(canManageConsultationForVisit(user, visit)).toBe(false);
  });

  it("denies admin even when assigned", () => {
    const user = { id: 1, role: "admin", permissions: liveboardPerms };
    const visit = { doctor_id: 1, status: "consulting" };
    expect(canManageConsultationForVisit(user, visit)).toBe(false);
  });
});

describe("canUseLiveboardButton", () => {
  it("allows medical officer by role rule", () => {
    const user = { id: 1, role: "medical_officer" };
    const visit = { doctor_id: 999, therapists: [] };
    expect(
      canUseLiveboardButton(user, visit, "open_panel", DEFAULT_LIVEBOARD_RULES),
    ).toBe(true);
  });

  it("allows assigned_user path when enabled", () => {
    const user = { id: 11, role: "cashier" };
    const visit = { doctor_id: 11, therapists: [] };
    expect(
      canUseLiveboardButton(
        user,
        visit,
        "open_consulting",
        DEFAULT_LIVEBOARD_RULES,
      ),
    ).toBe(true);
  });
});

describe("canAccessTreatmentRoom", () => {
  it("is true for assigned therapist on a treatment visit", () => {
    const user = { id: 3, role: "therapist", permissions: liveboardPerms };
    const visit = {
      status: "treatment",
      doctor_id: 9,
      therapists: [{ id: 3, name: "T" }],
    };
    expect(canAccessTreatmentRoom(user, visit)).toBe(true);
  });

  it("is false for therapist not on the care team", () => {
    const user = { id: 3, role: "therapist", permissions: liveboardPerms };
    const visit = {
      status: "treatment",
      doctor_id: 9,
      therapists: [{ id: 99, name: "Other" }],
    };
    expect(canAccessTreatmentRoom(user, visit)).toBe(false);
  });

  it("is false when visit is not in treatment", () => {
    const user = { id: 3, role: "therapist", permissions: liveboardPerms };
    const visit = { status: "preparation", therapists: [{ id: 3 }] };
    expect(canAccessTreatmentRoom(user, visit)).toBe(false);
  });

  it("is true for doctor assigned on a treatment session", () => {
    const user = { id: 5, role: "medical_officer", permissions: liveboardPerms };
    const visit = {
      status: "treatment",
      doctor_id: 9,
      treatments: [{ id: 1, assigned_doctor_id: 5 }],
    };
    expect(canAccessTreatmentRoom(user, visit)).toBe(true);
  });

  it("is false for pending doctor handover receiver before accept", () => {
    const user = { id: 5, role: "medical_officer", permissions: liveboardPerms };
    const visit = {
      status: "treatment",
      doctor_id: 9,
      doctor_handover_to_id: 5,
    };
    expect(isPendingDoctorHandoverReceiver(user, visit)).toBe(true);
    expect(canAccessTreatmentRoom(user, visit)).toBe(false);
  });
});

describe("canEditProcedureRecordOnVisit session scope", () => {
  it("blocks visit doctor from session assigned to another doctor", () => {
    const user = { id: 2, role: "medical_officer", permissions: liveboardPerms };
    const visit = { doctor_id: 2 };
    const session = { assigned_doctor_id: 8 };
    expect(canEditProcedureRecordOnVisit(user, visit, session)).toBe(false);
  });

  it("allows assigned session doctor to edit", () => {
    const user = { id: 8, role: "medical_officer", permissions: liveboardPerms };
    const visit = { doctor_id: 2 };
    const session = { assigned_doctor_id: 8 };
    expect(canEditProcedureRecordOnVisit(user, visit, session)).toBe(true);
    expect(hasAssignedTreatmentDoctorSession(user, {
      ...visit,
      treatments: [session],
    })).toBe(true);
  });
});

describe("canOpenVisitPanel treatment stage", () => {
  it("allows assigned therapist to open treatment visit", () => {
    const user = { id: 7, role: "therapist", permissions: liveboardPerms };
    const visit = {
      status: "treatment",
      doctor_id: 2,
      therapists: [{ id: 7 }],
    };
    expect(canOpenVisitPanel(user, visit)).toBe(true);
  });
});

describe("canOpenVisitPanel check-in staff coordinator", () => {
  it("allows designated reception to open a consulting visit", () => {
    const user = { id: 10, role: "reception", permissions: ["liveboard.view"] };
    const visit = {
      status: "consulting",
      doctor_id: 2,
      check_in_staff_id: 10,
    };
    expect(canOpenVisitPanel(user, visit)).toBe(true);
  });

  it("matches check_in_staff relation id", () => {
    const user = {
      id: 10,
      role: "sales_marketing",
      permissions: ["liveboard.view"],
    };
    const visit = {
      status: "payment",
      doctor_id: 2,
      check_in_staff: { id: 10, name: "Desk" },
    };
    expect(canOpenVisitPanel(user, visit)).toBe(true);
  });

  it("denies other reception for consulting when not check-in staff", () => {
    const user = { id: 11, role: "reception", permissions: ["liveboard.view"] };
    const visit = {
      status: "consulting",
      check_in_staff_id: 10,
    };
    expect(canOpenVisitPanel(user, visit)).toBe(false);
  });
});

describe("canAccessPreparationPanel", () => {
  it("allows owner and admin", () => {
    const owner = { id: 1, role: "owner", permissions: [] };
    const admin = { id: 2, role: "admin", permissions: ["liveboard.view"] };
    const visit = { check_in_staff_id: 99 };
    expect(canAccessPreparationPanel(owner, visit)).toBe(true);
    expect(canAccessPreparationPanel(admin, visit)).toBe(true);
  });

  it("allows the checked-in front desk staff", () => {
    const user = { id: 10, role: "reception", permissions: ["liveboard.view"] };
    const visit = { check_in_staff_id: 10 };
    expect(canAccessPreparationPanel(user, visit)).toBe(true);
  });

  it("denies non checked-in staff", () => {
    const user = { id: 11, role: "reception", permissions: ["liveboard.view"] };
    const visit = { check_in_staff_id: 10 };
    expect(canAccessPreparationPanel(user, visit)).toBe(false);
  });
});

describe("canHandoverCheckIn", () => {
  it("is true for owner", () => {
    const user = { id: 1, role: "owner", permissions: [] };
    const visit = { check_in_staff_id: 99 };
    expect(canHandoverCheckIn(user, visit)).toBe(true);
  });

  it("is true for current check-in reception with liveboard.update", () => {
    const user = {
      id: 5,
      role: "reception",
      permissions: ["liveboard.view", "liveboard.update"],
    };
    const visit = { check_in_staff_id: 5 };
    expect(canHandoverCheckIn(user, visit)).toBe(true);
  });

  it("is false without liveboard.update", () => {
    const user = { id: 5, role: "reception", permissions: ["liveboard.view"] };
    const visit = { check_in_staff_id: 5 };
    expect(canHandoverCheckIn(user, visit)).toBe(false);
  });
});

describe("getNavItems", () => {
  it("shows admin nav for custom roles with users.manage", () => {
    const items = getNavItems({
      role: "custom_role",
      roles: [{ slug: "custom_role" }],
      permissions: ["users.manage"],
    });

    const serialized = JSON.stringify(items);
    expect(serialized.includes("/admin/users")).toBe(true);
  });

  it("shows roles and permissions only for owner", () => {
    const nonOwnerItems = getNavItems({
      role: "admin",
      roles: [{ slug: "admin" }],
      permissions: ["roles.manage"],
    });
    const ownerItems = getNavItems({
      role: "owner",
      roles: [{ slug: "owner" }],
      permissions: [],
    });

    const nonOwnerSerialized = JSON.stringify(nonOwnerItems);
    const ownerSerialized = JSON.stringify(ownerItems);
    expect(nonOwnerSerialized.includes("/owner/roles-permissions")).toBe(
      false,
    );
    expect(ownerSerialized.includes("/owner/roles-permissions")).toBe(
      true,
    );
  });

  it("does not include lab or pharmacy sections", () => {
    const ownerItems = getNavItems({
      role: "owner",
      roles: [{ slug: "owner" }],
      permissions: ["lab.view"],
    });
    const receptionItems = getNavItems({
      role: "pharmacist",
      roles: [{ slug: "pharmacist" }],
      permissions: [],
    });
    const therapistItems = getNavItems({
      role: "technician",
      roles: [{ slug: "technician" }],
      permissions: ["lab.view"],
    });

    const serialized = JSON.stringify([
      ownerItems,
      receptionItems,
      therapistItems,
    ]);
    expect(serialized.includes("/lab")).toBe(false);
    expect(serialized.includes("/pharmacy")).toBe(false);
  });
});
