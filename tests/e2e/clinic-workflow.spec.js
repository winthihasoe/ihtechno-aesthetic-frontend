import { expect, test } from "@playwright/test";

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((u) => !String(u.pathname).includes("/login"));
}

async function openLiveBoard(page) {
  await page.getByRole("link", { name: "Visit History" }).click();
  await expect(page.getByText("Real-time patient flow")).toBeVisible();
}

async function logout(page) {
  await page.getByTitle("Logout").click();
  await page.waitForURL(/\/login$/);
}

function patientCard(page, column, patientName) {
  if (column === "completed") {
    return page
      .getByTestId("liveboard-completed")
      .locator(`[data-patient-name="${patientName}"]`)
      .first();
  }
  return page
    .getByTestId(`column-${column}`)
    .locator(`[data-patient-name="${patientName}"]`)
    .first();
}

async function confirmDialog(page, buttonLabel) {
  await page.getByRole("button", { name: buttonLabel }).click();
}

async function closeDrawer(page) {
  await page.getByTitle("Close drawer").click();
}

const API_BASE = "http://127.0.0.1:8000/api";

/** Assign MO/Derm on waiting visit (LiveBoard rule: only assignee can start consultation). */
async function assignWaitingDoctorForVisit(page, visitId) {
  const token = await page.evaluate(() => localStorage.getItem("dermafairy_token"));
  if (!token) throw new Error("Missing auth token for assignWaitingDoctorForVisit");
  const staffRes = await fetch(`${API_BASE}/liveboard/assignable-staff`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!staffRes.ok) {
    throw new Error(`assignable-staff failed: ${staffRes.status}`);
  }
  const staff = await staffRes.json();
  const doctor = staff.doctors.find((d) => d.email === "doctor@dermafairy.com");
  if (!doctor?.id) {
    throw new Error("Seeded doctor@dermafairy.com not found in assignable staff");
  }
  const assignRes = await fetch(`${API_BASE}/visits/${visitId}/assign-waiting-doctor`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ doctor_id: doctor.id }),
  });
  if (!assignRes.ok) {
    const body = await assignRes.text();
    throw new Error(`assign-waiting-doctor failed: ${assignRes.status} ${body}`);
  }
}

/** Assign therapist(s) so treatment-stage access rules pass for the therapist user. */
async function assignCareTeamForVisit(page, visitId) {
  const token = await page.evaluate(() => localStorage.getItem("dermafairy_token"));
  if (!token) throw new Error("Missing auth token for assignCareTeamForVisit");
  const staffRes = await fetch(`${API_BASE}/liveboard/assignable-staff`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!staffRes.ok) throw new Error(`assignable-staff failed: ${staffRes.status}`);
  const staff = await staffRes.json();
  const therapist = staff.therapists?.find((t) => t.email === "therapist@dermafairy.com") ?? staff.therapists?.[0];
  if (!therapist?.id) throw new Error("No therapist in assignable staff");
  const visitRes = await fetch(`${API_BASE}/visits/${visitId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!visitRes.ok) throw new Error(`visit fetch failed: ${visitRes.status}`);
  const visit = await visitRes.json();
  const doctorId = visit.doctor_id;
  if (!doctorId) throw new Error("visit missing doctor_id for care team assignment");
  const assignRes = await fetch(`${API_BASE}/visits/${visitId}/assignments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ doctor_id: doctorId, therapist_ids: [therapist.id] }),
  });
  if (!assignRes.ok) {
    const body = await assignRes.text();
    throw new Error(`assignments failed: ${assignRes.status} ${body}`);
  }
}

/** Backend requires at least one treatment session with a line item before marking a session done. */
async function ensureTreatmentSessionExists(page, visitId) {
  const token = await page.evaluate(() => localStorage.getItem("dermafairy_token"));
  if (!token) throw new Error("Missing auth token for ensureTreatmentSessionExists");
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  const loadList = async () => {
    const listRes = await fetch(`${API_BASE}/visits/${visitId}/treatments`, { headers });
    if (!listRes.ok) throw new Error(`list treatments failed: ${listRes.status}`);
    return listRes.json();
  };
  let list = await loadList();
  if (!Array.isArray(list) || list.length === 0) {
    const createRes = await fetch(`${API_BASE}/visits/${visitId}/treatments`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      throw new Error(`create treatment failed: ${createRes.status} ${body}`);
    }
    list = await loadList();
  }
  for (const t of list) {
    if (t.status === "completed") continue;
    const hasItems = (t.items && t.items.length > 0) || (t.session_products && t.session_products.length > 0);
    if (hasItems) continue;
    const itemRes = await fetch(`${API_BASE}/treatments/${t.id}/items`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        procedure_name: "Playwright procedure",
        product_name: "Serum",
        dosage: "1",
        unit: "session",
      }),
    });
    if (!itemRes.ok) {
      const body = await itemRes.text();
      throw new Error(`add treatment item failed: ${itemRes.status} ${body}`);
    }
  }
}

test("clinic workflow across reception, doctor, therapist, and cashier", async ({ page }) => {
  const patientName = `Playwright Patient ${Date.now()}`;

  await login(page, "reception@dermafairy.com");
  await openLiveBoard(page);
  page.once("dialog", (dialog) => dialog.accept(patientName));
  await page.getByRole("button", { name: "New Visit" }).click();
  await confirmDialog(page, "Create");
  await expect(patientCard(page, "waiting", patientName)).toBeVisible();
  const visitId = await patientCard(page, "waiting", patientName).getAttribute("data-visit-id");
  if (!visitId) throw new Error("visit card missing data-visit-id");
  await assignWaitingDoctorForVisit(page, visitId);
  await page.reload();
  await expect(page.getByText("Real-time patient flow")).toBeVisible();
  await expect(patientCard(page, "waiting", patientName)).toBeVisible();
  await logout(page);

  await login(page, "doctor@dermafairy.com");
  await openLiveBoard(page);
  await patientCard(page, "waiting", patientName)
    .getByTestId("visit-action-start_consultation")
    .click();
  await confirmDialog(page, "Continue");
  await expect(patientCard(page, "consulting", patientName)).toBeVisible();

  await patientCard(page, "consulting", patientName).click();
  await page.getByRole("tab", { name: "Consultation" }).click();
  await page.getByLabel("Chief Complaint").fill("Skin irritation");
  await page.getByLabel("Treatment Plan").fill("Hydrating facial");
  await page.getByRole("button", { name: "Save Consultation" }).click();
  await closeDrawer(page);

  await patientCard(page, "consulting", patientName)
    .getByTestId("visit-action-send_to_preparation")
    .click();
  await confirmDialog(page, "Continue");
  await expect(patientCard(page, "preparation", patientName)).toBeVisible();

  await patientCard(page, "preparation", patientName)
    .getByTestId("visit-action-proceed_to_treatment")
    .click();
  await confirmDialog(page, "Continue");
  await expect(patientCard(page, "treatment", patientName)).toBeVisible();
  await assignCareTeamForVisit(page, visitId);
  await ensureTreatmentSessionExists(page, visitId);
  await page.reload();
  await expect(page.getByText("Real-time patient flow")).toBeVisible();
  await expect(patientCard(page, "treatment", patientName)).toBeVisible();
  await logout(page);

  await login(page, "therapist@dermafairy.com");
  await openLiveBoard(page);
  await patientCard(page, "treatment", patientName).getByRole("button", { name: "Start Treatment" }).click();
  await expect(page.getByRole("heading", { name: "Treatment Room" })).toBeVisible();
  await page.getByRole("button", { name: "Mark session done" }).click();
  await confirmDialog(page, "Mark done");
  await page.getByRole("button", { name: "Visit History" }).click();
  await expect(page.getByText("Real-time patient flow")).toBeVisible();

  await patientCard(page, "treatment", patientName)
    .getByTestId("visit-action-mark_treatment_done")
    .click();
  await confirmDialog(page, "Continue");
  await expect(patientCard(page, "payment", patientName)).toBeVisible();
  await logout(page);

  await login(page, "cashier@dermafairy.com");
  await openLiveBoard(page);
  await patientCard(page, "payment", patientName).click();
  await page.getByRole("tab", { name: "Payment" }).click();
  await page.getByLabel("Amount (Rp)").fill("150000");
  await page.getByRole("button", { name: "Mark as Paid" }).click();
  await closeDrawer(page);
  await page.reload();
  await openLiveBoard(page);
  await expect(patientCard(page, "completed", patientName)).toBeVisible();
});