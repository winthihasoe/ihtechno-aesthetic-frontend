import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Column from "../../../components/LiveBoard/Column";

vi.mock("../../../stores/useUIStore", () => ({
  default: () => ({ openDrawer: vi.fn() }),
}));

const mkVisit = (id, name) => ({
  id,
  status: "waiting",
  patient: { name },
  queue_number: `Q00${id}`,
  visited_at: new Date().toISOString(),
});

const renderColumn = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("Column", () => {
  it("renders with the correct data-testid and column label", () => {
    render(
      <Column status="waiting" visits={[]} role="doctor" onAction={vi.fn()} />,
    );
    expect(screen.getByTestId("column-waiting")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
  });

  it("shows visit count in the header chip", () => {
    const visits = [mkVisit(1, "Alice"), mkVisit(2, "Bob")];
    renderColumn(
      <Column
        status="consulting"
        visits={visits}
        role="doctor"
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders a PatientCard for each visit", () => {
    const visits = [mkVisit(10, "Alice"), mkVisit(11, "Bob")];
    renderColumn(
      <Column
        status="waiting"
        visits={visits}
        role="doctor"
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows 0 in the count chip when there are no visits", () => {
    render(
      <Column
        status="completed"
        visits={[]}
        role="cashier"
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
