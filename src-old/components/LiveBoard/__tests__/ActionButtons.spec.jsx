import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionButtons from "../../../components/LiveBoard/ActionButtons";
import { DEFAULT_LIVEBOARD_RULES } from "../../../utils/roleUtils";

vi.mock("../../../stores/settingsStore", () => ({
  default: (selector) =>
    selector({
      settings: { liveboard_rules: DEFAULT_LIVEBOARD_RULES },
    }),
}));

const permissions = ["liveboard.view", "liveboard.update"];

const doctorUser = (id = 1) => ({
  id,
  role: "medical_officer",
  permissions,
});

const cashierUser = { id: 3, role: "cashier", permissions };

const therapistUser = { id: 4, role: "therapist", permissions };

const adminUser = { id: 99, role: "admin", permissions };
const receptionUser = { id: 5, role: "reception", permissions };
const salesMarketingUser = { id: 6, role: "sales_marketing", permissions };

const mkVisit = (status, extra = {}) => ({ id: 1, status, ...extra });

describe("ActionButtons", () => {
  it('shows "Start Consultation" when the doctor is assigned to the waiting visit', () => {
    render(
      <ActionButtons
        visit={mkVisit("waiting", { doctor_id: 1 })}
        user={doctorUser(1)}
        onAction={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("visit-action-start_consultation"),
    ).toBeInTheDocument();
  });

  it("shows Start Consultation for medical officer even when another user is assigned", () => {
    render(
      <ActionButtons
        visit={mkVisit("waiting", { doctor_id: 999 })}
        user={doctorUser(1)}
        onAction={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("visit-action-start_consultation"),
    ).toBeInTheDocument();
  });

  it("shows Start Consultation for medical officer when no assignee exists", () => {
    render(
      <ActionButtons
        visit={mkVisit("waiting", { doctor_id: null })}
        user={doctorUser(1)}
        onAction={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("visit-action-start_consultation"),
    ).toBeInTheDocument();
  });

  it("allows admin to start consultation on another doctor's waiting visit", () => {
    render(
      <ActionButtons
        visit={mkVisit("waiting", { doctor_id: 50 })}
        user={adminUser}
        onAction={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("visit-action-start_consultation"),
    ).toBeInTheDocument();
  });

  it("does not show consultation button for cashier on a waiting visit", () => {
    render(
      <ActionButtons
        visit={mkVisit("waiting", { doctor_id: 99 })}
        user={cashierUser}
        onAction={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("visit-action-start_consultation"),
    ).not.toBeInTheDocument();
  });

  it('does not show "Mark Done" for therapist + treatment visit by default rules', () => {
    render(
      <ActionButtons
        visit={mkVisit("treatment")}
        user={therapistUser}
        onAction={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("visit-action-mark_treatment_done"),
    ).not.toBeInTheDocument();
  });

  it('shows "Mark Done" for admin and assigned therapist on treatment visits', () => {
    const { rerender } = render(
      <ActionButtons
        visit={mkVisit("treatment")}
        user={adminUser}
        onAction={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("visit-action-mark_treatment_done"),
    ).toBeInTheDocument();

    rerender(
      <ActionButtons
        visit={mkVisit("treatment", {
          therapist_id: 4,
          therapists: [{ id: 4 }],
        })}
        user={therapistUser}
        onAction={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("visit-action-mark_treatment_done"),
    ).toBeInTheDocument();
  });

  it('does not show "Mark Done" for reception without visit assignment', () => {
    render(
      <ActionButtons
        visit={mkVisit("treatment", { check_in_staff_id: 99 })}
        user={receptionUser}
        onAction={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("visit-action-mark_treatment_done"),
    ).not.toBeInTheDocument();
  });

  it('disables "Mark Done" when sessions are incomplete', () => {
    render(
      <ActionButtons
        visit={mkVisit("treatment")}
        user={adminUser}
        onAction={vi.fn()}
        disableMarkTreatmentDone
      />,
    );
    expect(screen.getByTestId("visit-action-mark_treatment_done")).toBeDisabled();
  });

  it("calls onAction and stops propagation when a button is clicked", () => {
    const onAction = vi.fn();
    const parentClick = vi.fn();
    const visit = mkVisit("waiting", { doctor_id: 1 });
    render(
      <div onClick={parentClick}>
        <ActionButtons
          visit={visit}
          user={doctorUser(1)}
          onAction={onAction}
        />
      </div>,
    );
    fireEvent.click(screen.getByTestId("visit-action-start_consultation"));
    expect(onAction).toHaveBeenCalledWith("start_consultation", visit);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
