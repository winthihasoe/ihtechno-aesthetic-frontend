import { describe, expect, it } from "vitest";
import { createDemoStore, demoPatients } from "../demoDatabase";

describe("demo clinical history", () => {
  it("gives every patient completed consults with treatments and notes", () => {
    const store = createDemoStore();
    for (const patient of demoPatients) {
      const visits = store.visits.filter((v) => v.patient_id === patient.id);
      const completed = visits.filter(
        (v) => v.status === "completed" && v.consultation,
      );
      expect(
        completed.length,
        `patient ${patient.id} completed consults`,
      ).toBeGreaterThanOrEqual(2);
      expect(
        completed.every((v) => (v.treatments ?? []).length > 0),
        `patient ${patient.id} treatments`,
      ).toBe(true);
      expect(
        completed.some((v) => String(v.consultation?.notes ?? "").trim()),
        `patient ${patient.id} notes`,
      ).toBe(true);
    }
  });

  it("gives every patient chart data for registry detail tabs", () => {
    const store = createDemoStore();
    for (const patient of demoPatients) {
      const forms =
        store.formResponsesByPatient[patient.id] ??
        store.formResponsesByPatient[String(patient.id)] ??
        [];
      expect(forms.length, `patient ${patient.id} form responses`).toBeGreaterThan(0);
      expect(
        store.medicalHistories[patient.id] ??
          store.medicalHistories[String(patient.id)],
        `patient ${patient.id} medical history`,
      ).toBeTruthy();
      const packages =
        store.patientPackagesByPatient[patient.id] ??
        store.patientPackagesByPatient[String(patient.id)] ??
        [];
      expect(packages.length, `patient ${patient.id} packages`).toBeGreaterThan(0);
    }
  });
});
