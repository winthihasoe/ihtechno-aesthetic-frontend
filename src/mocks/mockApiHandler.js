import {
  demoPasswords,
  getDemoStore,
  paginate,
  demoConsultationsByVisit,
  demoPrescriptionsByVisit,
  demoTreatmentsByVisit,
  demoLabResultsByPatient,
  buildPatientTimeline,
  buildEncountersRegister,
  buildPrescriptionsRegister,
  buildFormDetail,
  demoBatchesByProduct,
  buildInventoryAlerts,
  filterStockMovements,
  recomputeLabRequestStatus,
} from "./demoDatabase";
import {
  demoChartOfAccounts,
  buildProfitAndLoss,
  buildBalanceSheet,
  demoFixedAssets,
  buildCashFlows,
  demoJournalEntries,
  buildGeneralLedgerAccounts,
  buildGeneralLedgerLines,
  buildAccountingQueue,
} from "./financeDemo";
import {
  demoCommissions,
  buildCommissionSummary,
  demoAuditLogs,
} from "./reportsDemo";
import dayjs from "dayjs";
import { formatPatientNumber } from "../utils/patientUtils";

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

function parseBody(data) {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (data instanceof FormData) {
    const obj = {};
    data.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  return data;
}

function fileToDataUrl(file) {
  if (!file) return Promise.resolve("");
  if (typeof file === "string") return Promise.resolve(file);
  if (typeof Blob !== "undefined" && file instanceof Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Could not read photo"));
      reader.readAsDataURL(file);
    });
  }
  return Promise.resolve("");
}

function ensureVisitPhotos(visit) {
  if (!visit) return [];
  if (!Array.isArray(visit.photos)) visit.photos = [];
  return visit.photos;
}

function nextDemoPhotoId(store) {
  if (!store.nextPhotoId) {
    const maxExisting = store.visits.reduce((max, visit) => {
      const ids = (visit.photos ?? []).map((p) => Number(p.id) || 0);
      return Math.max(max, ...ids, 0);
    }, 0);
    store.nextPhotoId = maxExisting + 1;
  }
  return store.nextPhotoId++;
}

function findPhotoInStore(store, photoId) {
  for (const visit of store.visits) {
    const photos = ensureVisitPhotos(visit);
    const idx = photos.findIndex((p) => Number(p.id) === Number(photoId));
    if (idx >= 0) return { visit, photos, idx, photo: photos[idx] };
  }
  return null;
}

function normalizePath(url = "") {
  let path = String(url || "").split("?")[0];
  try {
    if (/^https?:\/\//i.test(path)) {
      path = new URL(path).pathname;
    }
  } catch {
    // keep path as-is
  }
  // Strip optional /api prefix from absolute or relative URLs
  path = path.replace(/^\/?api\//, "");
  return path.replace(/^\//, "");
}

function pathId(path, prefix) {
  const match = path.match(new RegExp(`^${prefix}/(\\d+)`));
  return match ? Number(match[1]) : null;
}

function findUserByToken(token) {
  if (!token || !String(token).startsWith("mock-token-")) return null;
  const id = Number(String(token).replace("mock-token-", ""));
  return getDemoStore().users.find((u) => u.id === id) ?? null;
}

function jsonResponse(data, status = 200) {
  return { data, status, statusText: "OK", headers: {}, config: {} };
}

function errorResponse(message, status = 404) {
  const err = new Error(message);
  err.response = { data: { message }, status };
  err.isAxiosError = true;
  throw err;
}

function filterVisits(visits, params = {}) {
  let rows = [...visits];
  if (params.date) {
    const day = String(params.date);
    rows = rows.filter((visit) =>
      dayjs(visit.visited_at ?? visit.created_at).format("YYYY-MM-DD") === day,
    );
  }
  if (params.status) {
    rows = rows.filter((visit) => visit.status === params.status);
  }
  if (params.doctor_id) {
    rows = rows.filter(
      (visit) => String(visit.doctor_id ?? "") === String(params.doctor_id),
    );
  }
  if (params.search) {
    const q = String(params.search).toLowerCase();
    rows = rows.filter((visit) => {
      const patientName = visit.patient?.name ?? visit.patientName ?? "";
      const queue = String(visit.queue_number ?? visit.queueNumber ?? "");
      return patientName.toLowerCase().includes(q) || queue.includes(q);
    });
  }
  return rows.sort(
    (a, b) =>
      dayjs(b.visited_at ?? b.created_at).valueOf() -
      dayjs(a.visited_at ?? a.created_at).valueOf(),
  );
}

function getTodayVisitPatientIds(visits) {
  const today = dayjs().format("YYYY-MM-DD");
  return new Set(
    visits
      .filter((visit) =>
        dayjs(visit.visited_at ?? visit.created_at).format("YYYY-MM-DD") === today,
      )
      .map((visit) => visit.patient_id)
      .filter(Boolean),
  );
}

function buildPatientStats(patients, visits) {
  const todayIds = getTodayVisitPatientIds(visits);
  return {
    total: patients.length,
    active: patients.filter((p) => p.status === "active").length,
    inactive: patients.filter((p) => p.status === "inactive").length,
    in_clinic_today: patients.filter((p) => todayIds.has(p.id)).length,
  };
}

function filterPatients(patients, params = {}) {
  let rows = [...patients];
  if (params.search) {
    const q = String(params.search).toLowerCase();
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.phone).includes(q) ||
        String(p.email).toLowerCase().includes(q) ||
        String(p.patient_number ?? "").toLowerCase().includes(q),
    );
  }
  if (params.phone) {
    rows = rows.filter((p) => p.phone === params.phone);
  }
  if (params.status) {
    rows = rows.filter((p) => p.status === params.status);
  }
  if (params.gender) {
    const gender = String(params.gender).toLowerCase();
    rows = rows.filter((p) => String(p.gender ?? "").toLowerCase() === gender);
  }
  if (params.last_visit) {
    const day = String(params.last_visit);
    rows = rows.filter((p) => p.last_visit_at?.startsWith(day));
  }
  if (params.last_visit_from) {
    const from = dayjs(String(params.last_visit_from)).startOf("day");
    rows = rows.filter((p) => {
      if (!p.last_visit_at) return false;
      return dayjs(p.last_visit_at).valueOf() >= from.valueOf();
    });
  }
  if (params.last_visit_to) {
    const to = dayjs(String(params.last_visit_to)).endOf("day");
    rows = rows.filter((p) => {
      if (!p.last_visit_at) return false;
      return dayjs(p.last_visit_at).valueOf() <= to.valueOf();
    });
  }
  return rows.sort(
    (a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf(),
  );
}

function updateVisitInStore(visitId, patch) {
  const store = getDemoStore();
  const idx = store.visits.findIndex((v) => v.id === visitId);
  if (idx === -1) return null;
  store.visits[idx] = { ...store.visits[idx], ...patch, updated_at: new Date().toISOString() };
  return store.visits[idx];
}

export async function handleMockRequest(config) {
  await delay();
  const method = (config.method || "get").toLowerCase();
  const path = normalizePath(config.url);
  const params = config.params || {};
  const body = parseBody(config.data);
  const store = getDemoStore();
  const token = config.headers?.Authorization?.replace("Bearer ", "") ||
    localStorage.getItem("dermafairy_token");

  // ── Auth ──────────────────────────────────────────────────────────────
  if (method === "post" && path === "login") {
    const email = body.email;
    const password = body.password;
    if (demoPasswords[email] !== password) {
      errorResponse("Invalid email or password", 401);
    }
    const user = store.users.find((u) => u.email === email);
    return jsonResponse({ user, token: `mock-token-${user.id}` });
  }

  if (method === "get" && path === "me") {
    const user = findUserByToken(token);
    if (!user) errorResponse("Unauthenticated", 401);
    return jsonResponse(user);
  }

  if (method === "post" && path === "logout") {
    return jsonResponse({ message: "Logged out" });
  }

  // ── Settings ──────────────────────────────────────────────────────────
  if (path === "settings") {
    if (method === "get") return jsonResponse(store.settings);
    if (method === "post") {
      Object.assign(store.settings, body);
      return jsonResponse(store.settings);
    }
  }

  if (path === "settings/invoice-next-number" && method === "put") {
    store.settings.invoice_next_number = body.invoice_next_number;
    return jsonResponse({ invoice_next_number: store.settings.invoice_next_number });
  }

  if (path === "settings/liveboard-rules") {
    if (method === "get") return jsonResponse({ liveboard_rules: store.settings.liveboard_rules });
    if (method === "put") {
      store.settings.liveboard_rules = body.liveboard_rules ?? store.settings.liveboard_rules;
      return jsonResponse({ liveboard_rules: store.settings.liveboard_rules });
    }
  }

  if (path === "settings/assignable-roles/options" && method === "get") {
    return jsonResponse({
      roles: store.roles.map((r) => ({ id: r.id, slug: r.slug, name: r.name })),
    });
  }

  // ── Patients ──────────────────────────────────────────────────────────
  if (path === "patients") {
    if (method === "get") {
      const filtered = filterPatients(store.patients, params);
      const todayIds = getTodayVisitPatientIds(store.visits);
      const enriched = filtered.map((patient) => ({
        ...patient,
        in_clinic_today: todayIds.has(patient.id),
      }));
      const stats = buildPatientStats(store.patients, store.visits);

      if (params.page || params.per_page) {
        const page = paginate(enriched, params);
        return jsonResponse({ ...page, stats });
      }
      return jsonResponse({ data: enriched, stats });
    }
    if (method === "post") {
      const id = store.nextPatientId++;
      const createdAt = new Date().toISOString();
      const patient = {
        id,
        patient_number: formatPatientNumber(id, dayjs(createdAt).year()),
        status: "active",
        type: "customer",
        created_at: createdAt,
        last_visit_at: null,
        in_clinic_today: false,
        data_collector: { id: 2, name: "May May" },
        ...body,
      };
      store.patients.unshift(patient);
      return jsonResponse(patient, 201);
    }
  }

  const patientId = pathId(path, "patients");
  if (patientId) {
    const patient = store.patients.find((p) => p.id === patientId);
    const patientVisits = store.visits
      .filter((v) => v.patient_id === patientId)
      .sort(
        (a, b) =>
          dayjs(b.visited_at ?? b.created_at).valueOf() -
          dayjs(a.visited_at ?? a.created_at).valueOf(),
      );
    if (path === `patients/${patientId}`) {
      if (method === "get") {
        if (!patient) errorResponse("Patient not found", 404);
        const formResponses =
          store.formResponsesByPatient?.[patientId] ??
          store.formResponsesByPatient?.[String(patientId)] ??
          [];
        const questionnaireResponse =
          formResponses.find(
            (r) =>
              r.form?.code === "aesthetic_health_information_mm" ||
              r.form?.code === "general_health_information",
          ) ?? formResponses[0] ?? null;
        return jsonResponse({
          ...patient,
          visits: patientVisits,
          medical_history: store.medicalHistories[patientId] ?? null,
          medicalHistory: store.medicalHistories[patientId] ?? null,
          formResponses,
          form_responses: formResponses,
          questionnaireResponse,
          questionnaire_response: questionnaireResponse,
        });
      }
      if (method === "put") {
        Object.assign(patient, body);
        return jsonResponse(patient);
      }
      if (method === "delete") {
        store.patients = store.patients.filter((p) => p.id !== patientId);
        return jsonResponse({ message: "Deleted" });
      }
    }
    if (path === `patients/${patientId}/notes` && method === "patch") {
      Object.assign(patient, body);
      return jsonResponse(patient);
    }
    if (path === `patients/${patientId}/medical-history`) {
      const existing = store.medicalHistories[patientId] ?? {
        id: patientId,
        patient_id: patientId,
        allergies: "",
        current_medications: "",
        chronic_diseases: "",
        pregnancy_status: false,
        breastfeeding_status: false,
        skin_conditions: "",
        past_aesthetic_history: "",
      };
      if (method === "get") return jsonResponse(existing);
      const updated = { ...existing, ...body };
      store.medicalHistories[patientId] = updated;
      return jsonResponse(updated);
    }
    if (path === `patients/${patientId}/timeline` && method === "get") {
      let events = buildPatientTimeline(patientId, patientVisits);
      if (params.type) {
        events = events.filter((e) => e.type === params.type);
      }
      return jsonResponse(events);
    }
    if (path === `patients/${patientId}/prescriptions` && method === "get") {
      const rows = patientVisits.flatMap((v) => v.prescriptions ?? []);
      return jsonResponse(rows);
    }
    if (path === `patients/${patientId}/packages` && method === "get") {
      return jsonResponse(
        store.patientPackagesByPatient?.[patientId] ??
          store.patientPackagesByPatient?.[String(patientId)] ??
          [],
      );
    }
    if (path === `patients/${patientId}/lab-results` && method === "get") {
      return jsonResponse(demoLabResultsByPatient[patientId] ?? []);
    }
  }

  // ── Visits / Live board ───────────────────────────────────────────────
  if (path === "visits") {
    if (method === "get") return jsonResponse(filterVisits(store.visits, params));
    if (method === "post") {
      const patient = store.patients.find((p) => p.id === Number(body.patient_id));
      const visit = {
        id: store.nextVisitId++,
        patient_id: body.patient_id,
        patient: patient ? { id: patient.id, name: patient.name, phone: patient.phone } : null,
        status: "waiting",
        queue_number: String(store.visits.length + 1).padStart(3, "0"),
        visited_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        doctor_id: null,
        doctor: null,
        therapist_id: null,
        therapist: null,
        therapists: [],
        check_in_mode: body.check_in_mode ?? "walk_in",
        check_in_staff: { id: 2, name: "May May" },
      };
      store.visits.unshift(visit);
      return jsonResponse(visit, 201);
    }
  }

  const visitId = pathId(path, "visits");
  if (visitId) {
    const visit = store.visits.find((v) => v.id === visitId);
    if (path === `visits/${visitId}`) {
      if (method === "get") {
        if (!visit) errorResponse("Visit not found", 404);
        return jsonResponse(visit);
      }
      if (method === "put") {
        const updated = updateVisitInStore(visitId, body);
        return jsonResponse(updated);
      }
    }

    const visitActionMap = {
      "start-consultation": { status: "consulting", doctor_id: body.doctor_id, doctor: store.users.find((u) => u.id === Number(body.doctor_id)) ? { id: Number(body.doctor_id), name: store.users.find((u) => u.id === Number(body.doctor_id)).name } : null },
      "send-to-preparation": { status: "preparation" },
      "go-to-preparation": { status: "preparation" },
      "send-to-treatment": { status: "treatment" },
      "checkout-from-consultation": { status: "treatment" },
      "complete-treatment": { status: "payment" },
      "complete-payment": { status: "completed" },
    };

    // Bill amount: consultation fee + each treatment line.
    const computeVisitAmount = (v) => {
      const treatments = Array.isArray(v?.treatments) ? v.treatments.length : 0;
      return 15000 + treatments * 12000;
    };

    for (const [action, patch] of Object.entries(visitActionMap)) {
      if (path === `visits/${visitId}/${action}` && method === "post") {
        const finalPatch = { ...patch };
        if (action === "complete-treatment") {
          const amount = visit?.payment?.amount || computeVisitAmount(visit);
          finalPatch.payment = {
            id: visit?.payment?.id ?? visitId,
            amount,
            status: "unpaid",
          };
          finalPatch.paymentAmount = amount;
        }
        if (action === "complete-payment") {
          const amount = visit?.payment?.amount || computeVisitAmount(visit);
          finalPatch.payment = {
            id: visit?.payment?.id ?? visitId,
            amount,
            status: "paid",
            paid_at: new Date().toISOString(),
          };
          finalPatch.paymentAmount = amount;
        }
        const updated = updateVisitInStore(visitId, finalPatch);
        return jsonResponse(updated);
      }
    }

    if (path === `visits/${visitId}/preparation-checklist` && method === "get") {
      return jsonResponse({ items: [], completed: true });
    }
    if (path === `visits/${visitId}/payment` && method === "get") {
      const payment = store.payments.find((p) => p.visit_id === visitId);
      return jsonResponse(payment ?? null);
    }
    if (path === `visits/${visitId}/payment` && method === "post") {
      return jsonResponse(store.payments.find((p) => p.visit_id === visitId) ?? { id: visitId, amount: 0, status: "unpaid" });
    }
    if (path === `visits/${visitId}/payment/generate` && method === "post") {
      return jsonResponse({ id: store.nextPaymentId++, visit_id: visitId, amount: 350000, status: "unpaid" });
    }
    if (path === `visits/${visitId}/consultation` && method === "get") {
      return jsonResponse(
        demoConsultationsByVisit[visitId] ??
          demoConsultationsByVisit[String(visitId)] ??
          visit?.consultation ??
          null,
      );
    }
    if (path === `visits/${visitId}/treatment` && method === "get") return jsonResponse(null);
    if (path === `visits/${visitId}/treatments` && method === "get") {
      return jsonResponse(
        demoTreatmentsByVisit[visitId] ??
          demoTreatmentsByVisit[String(visitId)] ??
          visit?.treatments ??
          [],
      );
    }
    if (path === `visits/${visitId}/prescriptions` && method === "get") {
      return jsonResponse(
        demoPrescriptionsByVisit[visitId] ??
          demoPrescriptionsByVisit[String(visitId)] ??
          visit?.prescriptions ??
          [],
      );
    }
    if (path === `visits/${visitId}/photos`) {
      if (!visit) errorResponse("Visit not found", 404);
      if (method === "get") {
        return jsonResponse(ensureVisitPhotos(visit).map((p) => ({ ...p })));
      }
      if (method === "post") {
        const file = body.photo ?? body.file ?? null;
        const url = await fileToDataUrl(file);
        if (!url) errorResponse("Photo file is required.", 422);
        const type = String(body.type || "before").toLowerCase() === "after"
          ? "after"
          : "before";
        const stage = ["consultation", "preparation", "treatment"].includes(
          String(body.stage || ""),
        )
          ? String(body.stage)
          : "consultation";
        const photo = {
          id: nextDemoPhotoId(store),
          visit_id: visitId,
          type,
          stage,
          body_area: body.body_area || "face",
          side: body.side || null,
          url,
          thumbnail_url: url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          map_points_count: 0,
          completed_map_points_count: 0,
        };
        ensureVisitPhotos(visit).unshift(photo);
        visit.updated_at = new Date().toISOString();
        return jsonResponse({ ...photo }, 201);
      }
    }
    if (path === `visits/${visitId}/lab-requests` && method === "get") {
      return jsonResponse(store.labRequests.filter((r) => r.visit_id === visitId));
    }
    if (path === `visits/${visitId}/patient-package-items` && method === "get") return jsonResponse([]);
    if (path.startsWith(`visits/${visitId}/`)) {
      const updated = updateVisitInStore(visitId, body);
      return jsonResponse(updated ?? visit);
    }
  }

  const photoId = pathId(path, "photos");
  if (photoId) {
    if (path === `photos/${photoId}` && method === "delete") {
      const found = findPhotoInStore(store, photoId);
      if (!found) errorResponse("Photo not found", 404);
      found.photos.splice(found.idx, 1);
      found.visit.updated_at = new Date().toISOString();
      return jsonResponse({ message: "Deleted" });
    }
    if (path === `photos/${photoId}/annotations` && method === "get") {
      return jsonResponse([]);
    }
    if (path === `photos/${photoId}/annotations` && method === "post") {
      return jsonResponse(
        {
          id: Date.now(),
          photo_id: photoId,
          annotation_data: body.annotation_data ?? body,
          created_at: new Date().toISOString(),
        },
        201,
      );
    }
  }

  if (path === "liveboard/assignable-staff" && method === "get") {
    return jsonResponse(
      store.users.filter((u) =>
        ["medical_officer", "dermatologist", "senior_nurse"].includes(u.role),
      ),
    );
  }

  // ── Appointments ──────────────────────────────────────────────────────
  if (path === "appointments") {
    if (method === "get") return jsonResponse(store.appointments);
    if (method === "post") {
      const appt = { id: store.nextAppointmentId++, status: "pending", ...body };
      store.appointments.push(appt);
      return jsonResponse(appt, 201);
    }
  }

  if (path === "appointments/assignable-doctors" && method === "get") {
    return jsonResponse(
      store.users.filter((u) => ["medical_officer", "dermatologist"].includes(u.role)),
    );
  }

  const appointmentId = pathId(path, "appointments");
  if (appointmentId) {
    const appt = store.appointments.find((a) => a.id === appointmentId);
    if (path === `appointments/${appointmentId}`) {
      if (method === "get") return jsonResponse(appt);
      if (method === "put") {
        Object.assign(appt, body);
        return jsonResponse(appt);
      }
    }
    for (const action of ["confirm", "cancel", "complete"]) {
      if (path === `appointments/${appointmentId}/${action}` && method === "post") {
        appt.status = action === "confirm" ? "confirmed" : action === "cancel" ? "cancelled" : "completed";
        return jsonResponse(appt);
      }
    }
  }

  // ── Payments ──────────────────────────────────────────────────────────
  if (path === "payments") {
    if (method === "get") {
      let rows = [...store.payments];
      if (params.status) rows = rows.filter((p) => p.status === params.status);
      if (params.patient_query) {
        const q = String(params.patient_query).toLowerCase();
        rows = rows.filter(
          (p) =>
            String(p.patient?.name ?? p.customer_name ?? "").toLowerCase().includes(q) ||
            String(p.invoice_number ?? "").toLowerCase().includes(q),
        );
      }
      if (params.min_amount != null && params.min_amount !== "")
        rows = rows.filter((p) => Number(p.amount) >= Number(params.min_amount));
      if (params.max_amount != null && params.max_amount !== "")
        rows = rows.filter((p) => Number(p.amount) <= Number(params.max_amount));
      rows.sort(
        (a, b) =>
          dayjs(b.paid_at ?? b.created_at).valueOf() -
          dayjs(a.paid_at ?? a.created_at).valueOf(),
      );
      return jsonResponse(rows);
    }
    if (method === "post") {
      const id = store.nextPaymentId++;
      const status = body.status || "issued";
      const amount = Number(body.amount ?? body.items?.totals?.grand ?? 0);
      const payment = {
        id,
        invoice_number: body.invoice_number || `INV-2026-${1000 + id}`,
        status,
        created_at: new Date().toISOString(),
        paid_at: status === "paid" ? new Date().toISOString() : null,
        amount,
        total_amount: amount,
        paid_amount: status === "paid" ? amount : 0,
        balance: status === "paid" ? 0 : amount,
        patient: body.patient_id
          ? store.patients?.find((p) => p.id === body.patient_id) ?? null
          : null,
        ...body,
        id,
        status,
        amount,
        total_amount: Number(body.total_amount ?? amount),
        paid_amount: Number(
          body.paid_amount ?? (status === "paid" ? amount : 0),
        ),
        balance: Number(
          body.balance ?? (status === "paid" ? 0 : amount),
        ),
      };
      store.payments.unshift(payment);
      return jsonResponse(payment, 201);
    }
  }

  const paymentId = pathId(path, "payments");
  if (paymentId) {
    const payment = store.payments.find((p) => p.id === paymentId);
    if (path === `payments/${paymentId}`) {
      if (method === "get") {
        if (!payment) return jsonResponse({ message: "Payment not found" }, 404);
        return jsonResponse(payment);
      }
      if (method === "put") {
        if (!payment) return jsonResponse({ message: "Payment not found" }, 404);
        Object.assign(payment, body);
        if (body.status === "paid") {
          const total = Number(
            payment.total_amount ?? payment.amount ?? payment.paid_amount ?? 0,
          );
          payment.status = "paid";
          payment.paid_amount = Number(payment.paid_amount ?? total);
          payment.balance = 0;
          payment.paid_at = payment.paid_at || new Date().toISOString();
          if (total > 0) {
            payment.amount = total;
            payment.total_amount = total;
          }
        } else if (
          body.amount != null ||
          body.items != null ||
          body.total_amount != null
        ) {
          const total = Number(
            payment.total_amount ?? payment.amount ?? body.amount ?? 0,
          );
          const paid = Number(payment.paid_amount ?? 0);
          payment.amount = total;
          payment.total_amount = total;
          payment.balance = Math.max(0, Number((total - paid).toFixed(2)));
          if (paid + 0.005 >= total && total > 0) {
            payment.status = "paid";
            payment.paid_at = payment.paid_at || new Date().toISOString();
            payment.balance = 0;
          }
        }
        return jsonResponse(payment);
      }
      if (method === "delete") {
        store.payments = store.payments.filter((p) => p.id !== paymentId);
        return jsonResponse({ message: "Deleted" });
      }
    }
    if (
      path === `payments/${paymentId}/transactions` &&
      (method === "post" || method === "get")
    ) {
      if (!payment) return jsonResponse({ message: "Payment not found" }, 404);
      if (method === "get") {
        return jsonResponse(
          Array.isArray(payment.transactions) ? payment.transactions : [],
        );
      }
      const amount = Number(body.amount ?? 0);
      const methodId = body.transaction_method_id;
      const tm =
        store.transactionMethods.find((m) => m.id === Number(methodId)) ?? null;
      const priorPaid = Number(payment.paid_amount ?? 0);
      const total = Number(
        payment.total_amount ??
          payment.amount ??
          payment.balance ??
          amount ??
          0,
      );
      const paidSoFar = priorPaid + (Number.isFinite(amount) ? amount : 0);
      const fullyPaid = total <= 0 ? amount > 0 : paidSoFar + 0.005 >= total;
      const nextStatus = fullyPaid
        ? "paid"
        : paidSoFar > 0
          ? "partial"
          : payment.status || "issued";
      Object.assign(payment, {
        amount: total > 0 ? total : paidSoFar,
        total_amount: total > 0 ? total : paidSoFar,
        paid_amount: paidSoFar,
        balance: fullyPaid ? 0 : Math.max(0, Number((total - paidSoFar).toFixed(2))),
        status: nextStatus,
        paid_at:
          nextStatus === "paid"
            ? new Date().toISOString()
            : payment.paid_at ?? null,
        transaction_method_id: methodId ?? payment.transaction_method_id,
        transaction_method: tm,
        method: tm?.name ?? payment.method,
      });
      if (!Array.isArray(payment.transactions)) payment.transactions = [];
      payment.transactions.push({
        id: (payment.transactions.at(-1)?.id ?? 0) + 1,
        amount,
        transaction_method_id: methodId,
        created_at: new Date().toISOString(),
      });
      return jsonResponse({ ...payment });
    }
  }

  // ── Follow-ups ────────────────────────────────────────────────────────
  if (path === "follow-up-tasks") {
    if (method === "get") return jsonResponse(store.followUps);
    if (method === "post") {
      const task = { id: store.followUps.length + 1, status: "pending", ...body };
      store.followUps.push(task);
      return jsonResponse(task, 201);
    }
  }

  if (path === "follow-up-tasks/assignable-staff" && method === "get") {
    return jsonResponse(store.users);
  }

  const followUpId = pathId(path, "follow-up-tasks");
  if (followUpId && path.startsWith(`follow-up-tasks/${followUpId}`)) {
    const task = store.followUps.find((f) => f.id === followUpId);
    if (path === `follow-up-tasks/${followUpId}` && method === "get") return jsonResponse(task);
    if (method === "post") {
      if (path.endsWith("/complete")) task.status = "completed";
      else if (path.endsWith("/start")) task.status = "in_progress";
      return jsonResponse(task);
    }
  }

  // ── Users & roles ─────────────────────────────────────────────────────
  if (path === "users" && method === "get") return jsonResponse(store.users);
  if (path === "users/assignable-roles" && method === "get") return jsonResponse(store.roles);
  if (path === "roles" && method === "get") return jsonResponse(store.roles);
  if (path === "permissions" && method === "get") {
    return jsonResponse(
      Array.from(new Set(store.roles.flatMap((r) => r.permissions))).map((slug, i) => ({
        id: i + 1,
        slug,
        name: slug,
      })),
    );
  }

  // ── HR ────────────────────────────────────────────────────────────────
  if (path === "departments" && method === "get") return jsonResponse(store.departments);
  if (path === "staffs" && method === "get") return jsonResponse(store.staffs);

  if (path === "attendance" && method === "get") {
    return jsonResponse({ data: store.attendance });
  }

  if (path === "leaves") {
    if (method === "get") return jsonResponse({ data: store.leaves });
  }
  const leaveId = pathId(path, "leaves");
  if (leaveId) {
    const leave = store.leaves.find((l) => l.id === leaveId);
    if (path === `leaves/${leaveId}/approve` && method === "put" && leave) {
      leave.status = "approved";
      return jsonResponse(leave);
    }
    if (path === `leaves/${leaveId}/reject` && method === "put" && leave) {
      leave.status = "rejected";
      return jsonResponse(leave);
    }
  }
  if (path === "leave-rules" && method === "get") {
    return jsonResponse({ annual_leave_days: 10, sick_leave_days: 14, casual_leave_days: 6 });
  }

  if (path === "overtimes" && method === "get") {
    return jsonResponse({ data: store.overtimes });
  }
  if (path === "staff-salaries" && method === "get") {
    return jsonResponse({
      data: store.staffs.map((s) => ({
        id: s.id,
        staff_id: s.id,
        staff: { id: s.id, name: s.name },
        base_salary: s.base_salary,
        effective_from: s.staff_profile?.joined_at || s.joined_at || "2020-01-01",
        created_at: s.staff_profile?.joined_at || s.joined_at || "2020-01-01",
      })),
    });
  }
  if (path === "staff-compensation-entries" && method === "get") return jsonResponse({ data: [] });
  if (path === "staff-transport-allowance-policies" && method === "get") return jsonResponse([]);

  if (path === "payrolls" && method === "get") {
    let rows = [...store.payrolls];
    if (params.month) rows = rows.filter((p) => p.month === params.month);
    return jsonResponse({ data: rows });
  }
  if (path === "payrolls/my" && method === "get") return jsonResponse({ data: [] });
  const payrollId = pathId(path, "payrolls");
  if (payrollId && path === `payrolls/${payrollId}/finalize` && method === "put") {
    const row = store.payrolls.find((p) => p.id === payrollId);
    if (row) row.status = "finalized";
    return jsonResponse(row ?? {});
  }

  if (path === "public-holidays" && method === "get") {
    let rows = [...store.publicHolidays];
    if (params.year) rows = rows.filter((h) => String(h.date).startsWith(String(params.year)));
    return jsonResponse(rows);
  }
  if (path === "public-holidays" && method === "post") {
    const holiday = { id: (store.publicHolidays.at(-1)?.id ?? 0) + 1, ...body };
    store.publicHolidays.push(holiday);
    return jsonResponse(holiday, 201);
  }

  if (path === "staff-grievances" && method === "get") {
    return jsonResponse({ data: store.grievances });
  }
  if (path === "staff-grievances/my" && method === "get") {
    return jsonResponse({ data: [] });
  }

  if (path === "commission-rules" && method === "get") return jsonResponse([]);
  if (path === "staff-assignments" && method === "get") return jsonResponse([]);
  if (path === "hr-tasks" && method === "get") return jsonResponse([]);
  if (path.startsWith("hr-reports/") && method === "get") return jsonResponse({ rows: [], summary: {} });

  const staffId = pathId(path, "staffs");
  if (staffId && path === `staffs/${staffId}` && method === "get") {
    const staff = store.staffs.find((s) => s.id === staffId);
    return jsonResponse(staff);
  }
  if (staffId && path === `staffs/${staffId}/custom-fields` && method === "get") {
    return jsonResponse({ definitions: [], values: [] });
  }
  if (staffId && path === `staffs/${staffId}/documents` && method === "get") {
    return jsonResponse([]);
  }

  const scheduleStaffId = pathId(path, "staff-schedules");
  if (scheduleStaffId && path === `staff-schedules/${scheduleStaffId}` && method === "get") {
    return jsonResponse([]);
  }

  // ── Inventory & products ──────────────────────────────────────────────
  if (path === "inventory/alerts" && method === "get") {
    return jsonResponse(buildInventoryAlerts({ days: Number(params.days) || 90 }));
  }
  if (path === "inventory/stock-movements" && method === "get") {
    const rows = filterStockMovements(params);
    return jsonResponse(paginate(rows, params));
  }
  if (path.startsWith("inventory/") && method === "get") return jsonResponse([]);

  if (path === "product-categories") {
    if (method === "get") return jsonResponse(store.productCategories);
    if (method === "post") {
      const category = {
        id: (store.productCategories.at(-1)?.id ?? 0) + 1,
        name: body.name,
        ...body,
      };
      store.productCategories.push(category);
      return jsonResponse(category, 201);
    }
  }
  if (path === "product-units") {
    if (method === "get") return jsonResponse(store.productUnits);
    if (method === "post") {
      const unit = { id: (store.productUnits.at(-1)?.id ?? 0) + 1, name: body.name, ...body };
      store.productUnits.push(unit);
      return jsonResponse(unit, 201);
    }
  }
  if (path === "product-types") {
    if (method === "get") return jsonResponse(store.productTypes);
    if (method === "post") {
      const type = { id: (store.productTypes.at(-1)?.id ?? 0) + 1, name: body.name, ...body };
      store.productTypes.push(type);
      return jsonResponse(type, 201);
    }
  }
  if (path === "products") {
    if (method === "get") return jsonResponse(store.products);
    if (method === "post") {
      const categoryId = body.category_id ?? null;
      const product = {
        id: (store.products.at(0)?.id ?? 0) + 100,
        total_stock: 0,
        stock_status: "out",
        nearest_expiry_date: null,
        selling_price: 0,
        min_stock_level: 0,
        ...body,
        category_id: categoryId,
        category: store.productCategories.find((c) => c.id === Number(categoryId)) ?? null,
      };
      store.products.unshift(product);
      return jsonResponse(product, 201);
    }
  }
  if (path === "product-picker-options" && method === "get") {
    const rows = (store.products || []).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      selling_price: p.selling_price,
      total_stock: p.total_stock,
      nearest_expiry_date: p.nearest_expiry_date ?? null,
      batch_number: "FEFO",
    }));
    return jsonResponse(rows);
  }
  if (path === "products/autocomplete" && method === "get") {
    const q = String(params.search ?? "").toLowerCase();
    const rows = store.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.sku ?? "").toLowerCase().includes(q),
    );
    return jsonResponse(rows.slice(0, Number(params.limit) || 20));
  }

  const productId = pathId(path, "products");
  if (productId) {
    const product = store.products.find((p) => p.id === productId);
    if (path === `products/${productId}` && method === "get") {
      if (!product) errorResponse("Product not found", 404);
      return jsonResponse(product);
    }
    if (path === `products/${productId}` && method === "put") {
      if (product) Object.assign(product, body);
      return jsonResponse(product ?? body);
    }
    if (path === `products/${productId}/batches` && method === "get") {
      return jsonResponse(demoBatchesByProduct[productId] ?? []);
    }
    if (path === `products/${productId}/movements` && method === "get") {
      return jsonResponse(filterStockMovements({ product_id: productId }));
    }
    if (path === `products/${productId}/adjust` && method === "post") {
      return jsonResponse({ success: true, ...body });
    }
  }

  if (path === "suppliers") {
    if (method === "get") return jsonResponse(store.suppliers);
    if (method === "post") {
      const supplier = { id: store.nextSupplierId++, ...body };
      store.suppliers.push(supplier);
      return jsonResponse(supplier, 201);
    }
  }
  const supplierId = pathId(path, "suppliers");
  if (supplierId && path === `suppliers/${supplierId}`) {
    const supplier = store.suppliers.find((s) => s.id === supplierId);
    if (method === "put" && supplier) {
      Object.assign(supplier, body);
      return jsonResponse(supplier);
    }
    if (method === "delete") {
      store.suppliers = store.suppliers.filter((s) => s.id !== supplierId);
      return jsonResponse({ message: "Deleted" });
    }
  }

  if (path === "purchases") {
    if (method === "get") return jsonResponse(store.purchases);
    if (method === "post") {
      const items = Array.isArray(body.items) ? body.items : [];
      const purchase = {
        id: store.nextPurchaseId++,
        date: body.date ?? dayjs().format("YYYY-MM-DD"),
        status: body.status ?? "received",
        receipt_type: body.receipt_type ?? "purchased",
        supplier: store.suppliers.find((s) => s.id === Number(body.supplier_id)) ?? null,
        created_by: { id: 2, name: "Nurse May May" },
        created_at: new Date().toISOString(),
        ...body,
        items,
        items_count: items.length,
        total: items.reduce(
          (s, it) => s + Number(it.quantity || 0) * Number(it.cost_price || 0),
          0,
        ),
      };
      store.purchases.unshift(purchase);
      return jsonResponse(purchase, 201);
    }
  }
  const purchaseId = pathId(path, "purchases");
  if (purchaseId && path === `purchases/${purchaseId}` && method === "get") {
    return jsonResponse(store.purchases.find((p) => p.id === purchaseId) ?? null);
  }

  // ── Treatments & packages ─────────────────────────────────────────────
  if (path === "treatment-categories") {
    if (method === "get") return jsonResponse(store.treatmentCategories);
    if (method === "post") {
      const category = {
        id: (store.treatmentCategories.at(-1)?.id ?? 0) + 1,
        name: body.name,
        ...body,
      };
      store.treatmentCategories.push(category);
      return jsonResponse(category, 201);
    }
  }
  if (path === "treatment-templates/active" && method === "get") {
    return jsonResponse(store.treatmentTemplates.filter((t) => t.is_active));
  }
  if (path === "treatment-templates") {
    if (method === "get") return jsonResponse(store.treatmentTemplates);
    if (method === "post") {
      const categoryId = body.category_id ?? body.treatment_category_id ?? null;
      const category =
        store.treatmentCategories.find((c) => c.id === Number(categoryId)) ?? null;
      const template = {
        id: store.nextTemplateId++,
        is_active: true,
        duration_minutes: null,
        price: 0,
        ...body,
        category_id: categoryId,
        category,
      };
      store.treatmentTemplates.unshift(template);
      return jsonResponse(template, 201);
    }
  }
  const templateId = pathId(path, "treatment-templates");
  if (templateId && path === `treatment-templates/${templateId}`) {
    const template = store.treatmentTemplates.find((t) => t.id === templateId);
    if (method === "get") return jsonResponse(template ?? null);
    if (method === "put" && template) {
      Object.assign(template, body);
      if (body.category_id != null) {
        template.category =
          store.treatmentCategories.find((c) => c.id === Number(body.category_id)) ??
          template.category;
      }
      return jsonResponse(template);
    }
    if (method === "delete") {
      store.treatmentTemplates = store.treatmentTemplates.filter(
        (t) => t.id !== templateId,
      );
      return jsonResponse({ message: "Deleted" });
    }
  }
  if (path === "packages") {
    if (method === "get") return jsonResponse(store.packages);
    if (method === "post") {
      const items = Array.isArray(body.items) ? body.items : [];
      const pkg = {
        id: store.nextPackageId++,
        is_active: true,
        ...body,
        items,
        items_count: items.length,
      };
      store.packages.unshift(pkg);
      return jsonResponse(pkg, 201);
    }
  }
  const packagePathId = pathId(path, "packages");
  if (packagePathId && path === `packages/${packagePathId}`) {
    const pkg = store.packages.find((p) => p.id === packagePathId);
    if (method === "get") return jsonResponse(pkg ?? null);
    if (method === "put" && pkg) {
      Object.assign(pkg, body);
      if (Array.isArray(body.items)) pkg.items_count = body.items.length;
      return jsonResponse(pkg);
    }
    if (method === "delete") {
      store.packages = store.packages.filter((p) => p.id !== packagePathId);
      return jsonResponse({ message: "Deleted" });
    }
  }
  if (path === "transaction-methods" && method === "get") return jsonResponse(store.transactionMethods);

  // ── Consultation & prescription registers ──────────────────────────────
  if (path === "encounters" && method === "get") {
    let rows = buildEncountersRegister();
    if (params.search) {
      const q = String(params.search).toLowerCase();
      rows = rows.filter(
        (r) =>
          r.patient_name.toLowerCase().includes(q) ||
          String(r.patient_number).toLowerCase().includes(q) ||
          r.diagnosis.toLowerCase().includes(q) ||
          r.chief_complaint.toLowerCase().includes(q),
      );
    }
    if (params.doctor) {
      rows = rows.filter((r) => r.doctor_name === params.doctor);
    }
    return jsonResponse(rows);
  }

  if (path === "prescriptions" && method === "get") {
    let rows = buildPrescriptionsRegister();
    if (params.search) {
      const q = String(params.search).toLowerCase();
      rows = rows.filter(
        (r) =>
          r.patient_name.toLowerCase().includes(q) ||
          String(r.patient_number).toLowerCase().includes(q) ||
          r.medicines.toLowerCase().includes(q),
      );
    }
    return jsonResponse(rows);
  }

  // ── Lab ───────────────────────────────────────────────────────────────
  if (path === "lab-tests") {
    if (method === "get") {
      let rows = [...store.labTests];
      if (params.active_only) rows = rows.filter((t) => t.is_active);
      if (params.search) {
        const q = String(params.search).toLowerCase();
        rows = rows.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            String(t.code).toLowerCase().includes(q) ||
            String(t.category ?? "").toLowerCase().includes(q),
        );
      }
      return jsonResponse(rows);
    }
    if (method === "post") {
      const test = { id: (store.labTests.at(-1)?.id ?? 0) + 1, is_active: true, ...body };
      store.labTests.push(test);
      return jsonResponse(test, 201);
    }
  }
  const labTestId = pathId(path, "lab-tests");
  if (labTestId && path === `lab-tests/${labTestId}`) {
    const test = store.labTests.find((t) => t.id === labTestId);
    if (method === "put" && test) {
      Object.assign(test, body);
      return jsonResponse(test);
    }
    if (method === "delete") {
      store.labTests = store.labTests.filter((t) => t.id !== labTestId);
      return jsonResponse({ message: "Deleted" });
    }
  }

  if (path === "lab-requests" && method === "get") {
    let rows = [...store.labRequests];
    if (params.status) rows = rows.filter((r) => r.status === params.status);
    if (params.search) {
      const q = String(params.search).toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.patient?.name ?? "").toLowerCase().includes(q) ||
          (r.tests ?? []).some((t) => String(t).toLowerCase().includes(q)),
      );
    }
    rows = rows.sort(
      (a, b) => dayjs(b.requested_at).valueOf() - dayjs(a.requested_at).valueOf(),
    );
    return jsonResponse(rows);
  }
  const labRequestId = pathId(path, "lab-requests");
  if (labRequestId) {
    const request = store.labRequests.find((r) => r.id === labRequestId);
    if (path === `lab-requests/${labRequestId}` && method === "get") {
      if (!request) errorResponse("Lab request not found", 404);
      return jsonResponse(request);
    }
    if (path === `lab-requests/${labRequestId}/results` && method === "put") {
      if (!request) errorResponse("Lab request not found", 404);
      const updates = Array.isArray(body.items) ? body.items : [];
      const updateById = new Map(updates.map((u) => [u.id, u]));
      request.items = (request.items ?? []).map((item) => {
        const upd = updateById.get(item.id);
        if (!upd) return item;
        const hasValue =
          upd.result_value != null && String(upd.result_value).trim() !== "";
        return {
          ...item,
          result_value: upd.result_value ?? null,
          result_notes: upd.result_notes ?? null,
          status: hasValue ? "completed" : "pending",
          completed_at: hasValue ? new Date().toISOString() : null,
          completed_by: hasValue ? { id: 4, name: "Technician Hnin" } : null,
        };
      });
      request.status = recomputeLabRequestStatus(request);
      return jsonResponse(request);
    }
  }

  // ── Billing: other income ─────────────────────────────────────────────
  if (path === "other-incomes") {
    if (method === "get") {
      let rows = [...store.otherIncomes];
      if (params.status) rows = rows.filter((r) => r.status === params.status);
      return jsonResponse(
        rows.sort(
          (a, b) => dayjs(b.income_date).valueOf() - dayjs(a.income_date).valueOf(),
        ),
      );
    }
    if (method === "post") {
      const income = {
        id: store.nextOtherIncomeId++,
        status: "posted",
        income_date: body.income_date ?? dayjs().format("YYYY-MM-DD"),
        received_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        creator: { id: 1, name: "U Aung Min" },
        ...body,
      };
      store.otherIncomes.unshift(income);
      return jsonResponse(income, 201);
    }
  }
  const otherIncomeId = pathId(path, "other-incomes");
  if (otherIncomeId) {
    const income = store.otherIncomes.find((r) => r.id === otherIncomeId);
    if (path === `other-incomes/${otherIncomeId}` && method === "get") {
      return jsonResponse(income ?? null);
    }
    if (path === `other-incomes/${otherIncomeId}` && method === "put" && income) {
      Object.assign(income, body);
      return jsonResponse(income);
    }
    if (path === `other-incomes/${otherIncomeId}/void` && method === "post" && income) {
      income.status = "void";
      return jsonResponse(income);
    }
  }

  // ── Billing: expenses ─────────────────────────────────────────────────
  if (path === "expenses") {
    if (method === "get") {
      let rows = [...store.expenses];
      if (params.category) rows = rows.filter((r) => r.category === params.category);
      return jsonResponse(
        rows.sort(
          (a, b) => dayjs(b.expense_date).valueOf() - dayjs(a.expense_date).valueOf(),
        ),
      );
    }
    if (method === "post") {
      const expense = {
        id: store.nextExpenseId++,
        status: "posted",
        expense_date: body.expense_date ?? dayjs().format("YYYY-MM-DD"),
        created_at: new Date().toISOString(),
        branch: { id: 1, name: "Main Clinic" },
        creator: { id: 1, name: "U Aung Min" },
        ...body,
      };
      store.expenses.unshift(expense);
      return jsonResponse(expense, 201);
    }
  }

  // ── Billing: supplier payables ────────────────────────────────────────
  if (path === "supplier-payables") {
    if (method === "get") {
      let rows = [...store.supplierPayables];
      if (params.status) rows = rows.filter((r) => r.status === params.status);
      return jsonResponse(
        rows.sort(
          (a, b) => dayjs(a.due_date).valueOf() - dayjs(b.due_date).valueOf(),
        ),
      );
    }
    if (method === "post") {
      const total = Number(body.total_amount || 0);
      const payable = {
        id: store.nextSupplierPayableId++,
        status: "open",
        paid_amount: 0,
        balance: total,
        created_at: new Date().toISOString(),
        supplier: store.suppliers.find((s) => s.id === Number(body.supplier_id)) ?? null,
        ...body,
        total_amount: total,
      };
      store.supplierPayables.unshift(payable);
      return jsonResponse(payable, 201);
    }
  }
  const payableId = pathId(path, "supplier-payables");
  if (payableId) {
    const payable = store.supplierPayables.find((r) => r.id === payableId);
    if (path === `supplier-payables/${payableId}` && method === "get") {
      return jsonResponse(payable ?? null);
    }
    if (path === `supplier-payables/${payableId}/pay` && method === "post" && payable) {
      const pay = Number(body.amount || 0);
      payable.paid_amount = Number(payable.paid_amount || 0) + pay;
      payable.balance = Math.max(0, Number(payable.total_amount) - payable.paid_amount);
      payable.status = payable.balance <= 0 ? "paid" : "partial";
      return jsonResponse(payable);
    }
    if (path === `supplier-payables/${payableId}/void` && method === "post" && payable) {
      payable.status = "void";
      return jsonResponse(payable);
    }
  }

  // ── Financial Management ──────────────────────────────────────────────
  if (path === "chart-of-accounts") {
    if (method === "get") {
      let rows = [...demoChartOfAccounts];
      if (params.is_active === true || params.is_active === "true")
        rows = rows.filter((a) => a.is_active);
      if (params.type) rows = rows.filter((a) => a.type === params.type);
      if (params.search) {
        const q = String(params.search).toLowerCase();
        rows = rows.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            String(a.code).toLowerCase().includes(q),
        );
      }
      return jsonResponse(rows);
    }
    if (method === "post") {
      const account = {
        id: (demoChartOfAccounts.at(-1)?.id ?? 0) + 1,
        is_active: true,
        is_system: false,
        type: "asset",
        ...body,
      };
      demoChartOfAccounts.push(account);
      return jsonResponse(account, 201);
    }
  }
  if (path === "reports/profit-and-loss" && method === "get") {
    return jsonResponse(buildProfitAndLoss());
  }
  if (path === "reports/balance-sheet" && method === "get") {
    return jsonResponse(buildBalanceSheet());
  }
  if (path === "reports/emr-audit-logs" && method === "get") {
    let rows = [...demoAuditLogs];
    if (params.module) rows = rows.filter((l) => l.module === params.module);
    if (params.from_date) {
      const from = dayjs(String(params.from_date)).startOf("day");
      rows = rows.filter((l) => dayjs(l.created_at).valueOf() >= from.valueOf());
    }
    if (params.to_date) {
      const to = dayjs(String(params.to_date)).endOf("day");
      rows = rows.filter((l) => dayjs(l.created_at).valueOf() <= to.valueOf());
    }
    return jsonResponse({ data: rows });
  }
  if (path.startsWith("reports/") && method === "get") {
    return jsonResponse({ rows: [], summary: {}, data: [] });
  }

  // ── Commissions ───────────────────────────────────────────────────────
  if (path === "commissions" && method === "get") {
    return jsonResponse({ data: demoCommissions });
  }
  if (path === "commissions/summary" && method === "get") {
    return jsonResponse(buildCommissionSummary());
  }
  if (path === "fixed-assets" && method === "get") {
    return jsonResponse(demoFixedAssets);
  }
  if (path === "cash-flows" && method === "get") {
    return jsonResponse({ data: buildCashFlows() });
  }
  if ((path === "journal-entries" || path === "journal-transactions") && method === "get") {
    return jsonResponse({ data: demoJournalEntries });
  }
  if (path === "general-ledger/accounts" && method === "get") {
    return jsonResponse({ data: buildGeneralLedgerAccounts() });
  }
  const glMatch = path.match(/^general-ledger\/accounts\/(\d+)\/lines$/);
  if (glMatch && method === "get") {
    return jsonResponse({ data: buildGeneralLedgerLines(Number(glMatch[1])) });
  }
  if (path === "accounting-queue" && method === "get") {
    let rows = buildAccountingQueue();
    if (params.status) rows = rows.filter((r) => r.journal_posting_status === params.status);
    return jsonResponse({ data: rows });
  }

  // ── Finance (fallback) ────────────────────────────────────────────────
  if (path.startsWith("finance/") && method === "get") return jsonResponse([]);
  if (path.startsWith("journal-entries") && method === "get") return jsonResponse([]);
  if (path.startsWith("chart-of-accounts") && method === "get") return jsonResponse([]);

  // ── Forms & misc ──────────────────────────────────────────────────────
  if (path === "forms") {
    if (method === "get") return jsonResponse(store.forms);
    if (method === "post") {
      const form = {
        id: store.nextFormId++,
        is_active: true,
        fields_count: 0,
        form_type: "other",
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...body,
      };
      store.forms.unshift(form);
      return jsonResponse(form, 201);
    }
  }

  const formId = pathId(path, "forms");
  if (formId && path === `forms/${formId}`) {
    if (method === "get") {
      const detail = buildFormDetail(formId);
      if (!detail) errorResponse("Form not found", 404);
      return jsonResponse(detail);
    }
    if (method === "put") {
      const form = store.forms.find((f) => f.id === formId);
      if (form) Object.assign(form, body, { updated_at: new Date().toISOString() });
      return jsonResponse(form ?? body);
    }
    if (method === "delete") {
      store.forms = store.forms.filter((f) => f.id !== formId);
      return jsonResponse({ message: "Deleted" });
    }
  }
  if (path === "notifications" && method === "get") return jsonResponse([]);
  if (path === "search" && method === "get") return jsonResponse({ patients: [], products: [], packages: [] });

  // ── Catch-all mutations ───────────────────────────────────────────────
  if (["post", "put", "patch", "delete"].includes(method)) {
    return jsonResponse(body && Object.keys(body).length ? body : { success: true });
  }

  // ── Catch-all GET ─────────────────────────────────────────────────────
  if (method === "get") return jsonResponse([]);

  return jsonResponse({});
}

export function createMockAdapter() {
  return async (config) => {
    const result = await handleMockRequest(config);
    return {
      data: result.data,
      status: result.status ?? 200,
      statusText: result.statusText ?? "OK",
      headers: result.headers ?? {},
      config,
      request: {},
    };
  };
}
