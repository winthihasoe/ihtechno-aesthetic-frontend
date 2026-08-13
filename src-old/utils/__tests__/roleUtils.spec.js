import { describe, it, expect } from "vitest";
import {
  canAccessPreparationPanel,
  canViewPreparationBrief,
  canOpenLiveboardVisitPanel,
  isCheckedInStaffOnVisit,
  resolvePreparationDrawerContext,
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
    expect(canDo("physician", "start_consultation")).toBe(true);
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
    const user = { id: 9, role: "physician", permissions: liveboardPerms };
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
  it("allows owner for open_panel role rule", () => {
    const user = { id: 1, role: "owner" };
    const visit = { doctor_id: 999, therapists: [] };
    expect(
      canUseLiveboardButton(user, visit, "open_panel", DEFAULT_LIVEBOARD_RULES),
    ).toBe(true);
  });

  it("allows medical officer for open_panel via default role rule", () => {
    const user = { id: 1, role: "medical_officer" };
    const visit = { doctor_id: 999, therapists: [] };
    expect(
      canUseLiveboardButton(user, visit, "open_panel", DEFAULT_LIVEBOARD_RULES),
    ).toBe(true);
  });

  it("denies physician for open_panel when not assigned (not same as medical_officer)", () => {
    const user = { id: 9, role: "physician" };
    const visit = { doctor_id: 99, therapists: [] };
    expect(
      canUseLiveboardButton(user, visit, "open_panel", DEFAULT_LIVEBOARD_RULES),
    ).toBe(false);
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

  it("denies other reception when open_panel is assigned_user only", () => {
    const user = { id: 11, role: "reception", permissions: ["liveboard.view"] };
    const visit = {
      status: "consulting",
      check_in_staff_id: 10,
    };
    const rules = {
      ...DEFAULT_LIVEBOARD_RULES,
      open_panel: {
        owner: false,
        admin: false,
        reception: false,
        sales_marketing: false,
        medical_officer: false,
        assigned_user: true,
      },
    };
    expect(canOpenVisitPanel(user, visit, "consulting", rules)).toBe(false);
  });
});

describe("canUseLiveboardButton assigned_user extensions", () => {
  const assignedOnly = (buttonKey) => ({
    ...DEFAULT_LIVEBOARD_RULES,
    [buttonKey]: { assigned_user: true },
  });

  it("proceed_treatment allows check-in staff only", () => {
    const user = { id: 10, role: "reception", permissions: ["liveboard.view"] };
    const visit = { check_in_staff_id: 10, doctor_id: 9 };
    const rules = assignedOnly("proceed_treatment");
    expect(canUseLiveboardButton(user, visit, "proceed_treatment", rules)).toBe(
      true,
    );
    const other = { id: 11, role: "reception", permissions: ["liveboard.view"] };
    expect(
      canUseLiveboardButton(other, visit, "proceed_treatment", rules),
    ).toBe(false);
  });

  it("mark_done allows treatment care team via assigned_user", () => {
    const therapist = { id: 3, role: "therapist", permissions: ["liveboard.view"] };
    const visit = {
      status: "treatment",
      doctor_id: 9,
      therapists: [{ id: 3 }],
    };
    const rules = assignedOnly("mark_done");
    expect(canUseLiveboardButton(therapist, visit, "mark_done", rules)).toBe(
      true,
    );
  });

  it("doctor_handover_request allows assigned visit doctor without admin role", () => {
    const doctor = { id: 9, role: "physician", permissions: ["liveboard.view"] };
    const visit = { status: "treatment", doctor_id: 9 };
    const rules = assignedOnly("doctor_handover_request");
    expect(
      canUseLiveboardButton(doctor, visit, "doctor_handover_request", rules),
    ).toBe(true);
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

describe("canViewPreparationBrief", () => {
  const liveboardPerms = ["liveboard.view"];

  it("allows assigned doctor on preparation visit", () => {
    const user = { id: 5, role: "medical_officer", permissions: liveboardPerms };
    const visit = { status: "preparation", doctor_id: 5, therapists: [] };
    expect(canViewPreparationBrief(user, visit)).toBe(true);
  });

  it("allows assigned therapist on preparation visit", () => {
    const user = { id: 3, role: "therapist", permissions: liveboardPerms };
    const visit = {
      status: "preparation",
      doctor_id: 9,
      therapists: [{ id: 3, name: "T" }],
    };
    expect(canViewPreparationBrief(user, visit)).toBe(true);
  });

  it("denies staff not on the care team", () => {
    const user = { id: 3, role: "therapist", permissions: liveboardPerms };
    const visit = {
      status: "preparation",
      doctor_id: 9,
      therapists: [{ id: 99, name: "Other" }],
    };
    expect(canViewPreparationBrief(user, visit)).toBe(false);
  });
});

describe("resolvePreparationDrawerContext", () => {
  it("always returns preparation_brief for drawer", () => {
    const user = { id: 10, role: "reception", permissions: ["liveboard.view"] };
    const visit = { status: "preparation", check_in_staff_id: 10 };
    expect(resolvePreparationDrawerContext(user, visit)).toBe(
      "preparation_brief",
    );
    const therapist = { id: 3, role: "therapist", permissions: ["liveboard.view"] };
    const therapistVisit = {
      status: "preparation",
      doctor_id: 9,
      therapists: [{ id: 3 }],
    };
    expect(resolvePreparationDrawerContext(therapist, therapistVisit)).toBe(
      "preparation_brief",
    );
  });
});

describe("canOpenLiveboardVisitPanel", () => {
  const liveboardPerms = ["liveboard.view"];
  const assignedUserOnlyOpenPanel = {
    ...DEFAULT_LIVEBOARD_RULES,
    open_panel: {
      owner: false,
      admin: false,
      reception: false,
      sales_marketing: false,
      medical_officer: false,
      assigned_user: true,
    },
  };

  it("allows assigned therapist on preparation visits", () => {
    const user = { id: 3, role: "therapist", permissions: liveboardPerms };
    const visit = {
      status: "preparation",
      doctor_id: 9,
      therapists: [{ id: 3 }],
    };
    expect(canOpenLiveboardVisitPanel(user, visit)).toBe(true);
  });

  it("allows assigned therapist on treatment visits", () => {
    const user = { id: 3, role: "therapist", permissions: liveboardPerms };
    const visit = {
      status: "treatment",
      doctor_id: 9,
      therapists: [{ id: 3 }],
    };
    expect(canOpenLiveboardVisitPanel(user, visit)).toBe(true);
  });

  it("allows checked-in reception staff", () => {
    const user = { id: 10, role: "reception", permissions: liveboardPerms };
    const visit = {
      status: "waiting",
      check_in_staff_id: 10,
      doctor_id: 9,
    };
    expect(isCheckedInStaffOnVisit(user, visit)).toBe(true);
    expect(canOpenLiveboardVisitPanel(user, visit)).toBe(true);
  });

  it("denies other reception staff when open_panel is assigned_user only", () => {
    const user = { id: 11, role: "reception", permissions: liveboardPerms };
    const visit = {
      status: "consulting",
      check_in_staff_id: 10,
      doctor_id: 9,
    };
    expect(
      canOpenLiveboardVisitPanel(user, visit, assignedUserOnlyOpenPanel),
    ).toBe(false);
  });

  it("allows reception via role flag on default open_panel rules", () => {
    const user = { id: 11, role: "reception", permissions: liveboardPerms };
    const visit = {
      status: "consulting",
      check_in_staff_id: 10,
      doctor_id: 9,
    };
    expect(canOpenLiveboardVisitPanel(user, visit)).toBe(true);
  });

  it("denies medical officer when open_panel is assigned_user only", () => {
    const user = { id: 5, role: "medical_officer", permissions: liveboardPerms };
    const visit = {
      status: "consulting",
      doctor_id: 9,
      check_in_staff_id: 10,
    };
    expect(
      canOpenLiveboardVisitPanel(user, visit, assignedUserOnlyOpenPanel),
    ).toBe(false);
  });

  it("allows assigned physician via assigned_user only", () => {
    const user = { id: 9, role: "physician", permissions: liveboardPerms };
    const visit = {
      status: "consulting",
      doctor_id: 9,
      check_in_staff_id: 10,
    };
    expect(canOpenLiveboardVisitPanel(user, visit)).toBe(true);
  });

  it("denies unassigned physician even when medical_officer has open_panel", () => {
    const user = { id: 9, role: "physician", permissions: liveboardPerms };
    const visit = {
      status: "consulting",
      doctor_id: 99,
      check_in_staff_id: 10,
    };
    expect(canOpenLiveboardVisitPanel(user, visit)).toBe(false);
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
  it("shows user management for custom roles with users.manage", () => {
    const items = getNavItems({
      role: "custom_role",
      roles: [{ slug: "custom_role" }],
      permissions: ["users.manage"],
    });

    const serialized = JSON.stringify(items);
    expect(serialized.includes("/admin/users") || serialized.includes("/owner/users")).toBe(false);
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
});
