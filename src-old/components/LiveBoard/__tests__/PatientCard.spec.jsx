import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PatientCard from "../../../components/LiveBoard/PatientCard";
import { DEFAULT_LIVEBOARD_RULES } from "../../../utils/roleUtils";

vi.mock("../../../stores/useUIStore", () => ({
  default: () => ({ openDrawer: vi.fn() }),
}));

vi.mock("../../../stores/settingsStore", () => ({
  default: (selector) =>
    selector({
      settings: { liveboard_rules: DEFAULT_LIVEBOARD_RULES },
    }),
}));

const mkVisit = (overrides = {}) => ({
  id: 42,
  status: "waiting",
  patient: { name: "Alice Smith" },
  queue_number: "Q001",
  visited_at: new Date().toISOString(),
  ...overrides,
});

const renderCard = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("PatientCard", () => {
  it("renders the patient name", () => {
    renderCard(<PatientCard visit={mkVisit()} role="doctor" onAction={vi.fn()} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("falls back to patientName when patient object is absent", () => {
    renderCard(
      <PatientCard
        visit={mkVisit({ patient: undefined, patientName: "Bob Jones" })}
        role="doctor"
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("shows 'Unknown' when no patient name can be resolved", () => {
    renderCard(
      <PatientCard
        visit={mkVisit({ patient: undefined, patientName: undefined })}
        role="doctor"
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("sets correct data-testid and data-patient-name attributes", () => {
    const { container } = renderCard(
      <PatientCard visit={mkVisit()} role="doctor" onAction={vi.fn()} />,
    );
    const card = container.querySelector('[data-testid="visit-card-42"]');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute("data-patient-name", "Alice Smith");
  });

  it("opens the panel from the explicit button", () => {
    const onOpenVisit = vi.fn();
    renderCard(
      <PatientCard
        visit={mkVisit()}
        user={{ role: "owner" }}
        onAction={vi.fn()}
        onOpenVisit={onOpenVisit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Panel" }));
    expect(onOpenVisit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      "waiting",
    );
  });

  it("does not open panel when clicking the card body", () => {
    const onOpenVisit = vi.fn();
    const { container } = renderCard(
      <PatientCard
        visit={mkVisit()}
        user={{ role: "owner" }}
        onAction={vi.fn()}
        onOpenVisit={onOpenVisit}
      />,
    );

    fireEvent.click(container.querySelector('[data-testid="visit-card-42"]'));
    expect(onOpenVisit).not.toHaveBeenCalled();
  });

  it("shows denied flow when open button is clicked without access", () => {
    const onOpenDenied = vi.fn();
    renderCard(
      <PatientCard
        visit={mkVisit()}
        user={null}
        onAction={vi.fn()}
        onOpenDenied={onOpenDenied}
      />,
    );

    expect(screen.queryByRole("button", { name: "Open Panel" })).not.toBeInTheDocument();
    expect(onOpenDenied).not.toHaveBeenCalled();
  });
});
