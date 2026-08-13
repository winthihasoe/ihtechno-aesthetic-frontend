import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ConsultationRoomPage from "../ConsultationRoomPage";

const mockGetVisit = vi.fn();
const mockGetConsultation = vi.fn();
const mockGetPhotos = vi.fn();
const mockCreateConsultation = vi.fn();

vi.mock("../../services/visitService", () => ({
  getVisit: (...args) => mockGetVisit(...args),
}));
vi.mock("../../services/consultationService", () => ({
  getConsultation: (...args) => mockGetConsultation(...args),
  createConsultation: (...args) => mockCreateConsultation(...args),
  updateConsultation: vi.fn(),
}));
vi.mock("../../services/photoService", () => ({
  getPhotos: (...args) => mockGetPhotos(...args),
}));
vi.mock("../../stores/authStore", () => ({
  default: () => ({ user: { role: "doctor", permissions: ["liveboard.view"] } }),
}));
vi.mock("../../stores/toastStore", () => ({
  default: () => ({ pushToast: vi.fn() }),
}));

describe("ConsultationRoomPage", () => {
  beforeEach(() => {
    mockGetVisit.mockResolvedValue({
      id: 10,
      queue_number: "A1",
      visit_time: "2026-05-01T10:00:00Z",
      patient: { name: "Test Patient" },
    });
    mockGetConsultation.mockResolvedValue(null);
    mockGetPhotos.mockResolvedValue([]);
    mockCreateConsultation.mockResolvedValue({ id: 1 });
  });

  it("renders and saves structured payload", async () => {
    render(
      <MemoryRouter initialEntries={["/doctor/visits/10/consultation-room"]}>
        <Routes>
          <Route path="/doctor/visits/:visitId/consultation-room" element={<ConsultationRoomPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("Consultation Room");
    fireEvent.change(screen.getByLabelText("Assessment (primary)"), { target: { value: "Acne vulgaris" } });
    fireEvent.click(screen.getByTestId("consultation-room-save-structured"));

    await waitFor(() => expect(mockCreateConsultation).toHaveBeenCalled());
    const payload = mockCreateConsultation.mock.calls[0][1];
    expect(payload.diagnosis_structured.primary).toBe("Acne vulgaris");
  });
});
