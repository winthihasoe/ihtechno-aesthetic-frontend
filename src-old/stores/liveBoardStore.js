import { create } from "zustand";
import dayjs from "dayjs";
import * as visitService from "../services/visitService";

const CARRYOVER_STATUSES = new Set([
  "waiting",
  "consulting",
  "preparation",
  "treatment",
  "payment",
]);
const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);

/** Merge API/WebSocket visit payloads so partial updates do not drop nested relations. */
function mergeVisit(prev, next) {
  if (!next) return prev;
  if (!prev) return next;
  return {
    ...prev,
    ...next,
    patient: next.patient ?? prev.patient,
    doctor: next.doctor ?? prev.doctor,
    therapist: next.therapist ?? prev.therapist,
    therapists: next.therapists ?? prev.therapists,
    payment: next.payment ?? prev.payment,
    photos: next.photos ?? prev.photos,
    check_in_staff: next.check_in_staff ?? prev.check_in_staff,
    check_in_handover_to:
      next.check_in_handover_to ?? prev.check_in_handover_to,
    check_in_handover_requested_by:
      next.check_in_handover_requested_by ?? prev.check_in_handover_requested_by,
    check_in_handover_requested_at:
      next.check_in_handover_requested_at ?? prev.check_in_handover_requested_at,
    check_in_staff_id:
      next.check_in_staff_id !== undefined && next.check_in_staff_id !== null
        ? next.check_in_staff_id
        : prev.check_in_staff_id,
    check_in_handover_to_id:
      next.check_in_handover_to_id !== undefined
        ? next.check_in_handover_to_id
        : prev.check_in_handover_to_id,
    check_in_handover_requested_by_id:
      next.check_in_handover_requested_by_id !== undefined
        ? next.check_in_handover_requested_by_id
        : prev.check_in_handover_requested_by_id,
  };
}

function isPriorDayVisit(visit) {
  if (!visit?.visit_time) return false;
  return !dayjs(visit.visit_time).isSame(dayjs(), "day");
}

function belongsInCarryover(visit) {
  if (!visit || TERMINAL_STATUSES.has(visit.status)) return false;
  return CARRYOVER_STATUSES.has(visit.status) && isPriorDayVisit(visit);
}

const useLiveBoardStore = create((set, get) => ({
  visits: [],
  carryoverVisits: [],
  loading: false,
  carryoverLoading: false,
  searchQuery: "",
  doctorFilter: "",

  fetchVisits: async ({ background = false } = {}) => {
    if (!background) {
      set({ loading: true });
    }
    try {
      const response = await visitService.getVisits();
      const visits = Array.isArray(response) ? response : (response.data ?? []);
      set(background ? { visits } : { visits, loading: false });
    } catch {
      if (!background) {
        set({ loading: false });
      }
    }
  },

  fetchCarryoverVisits: async ({ background = false } = {}) => {
    if (!background) {
      set({ carryoverLoading: true });
    }
    try {
      const response = await visitService.getCarryoverVisits();
      const carryoverVisits = Array.isArray(response)
        ? response
        : (response.data ?? []);
      set(
        background
          ? { carryoverVisits }
          : { carryoverVisits, carryoverLoading: false },
      );
    } catch {
      if (!background) {
        set({ carryoverLoading: false });
      }
    }
  },

  addVisit: (visit) => set((state) => ({ visits: [...state.visits, visit] })),

  updateVisit: (updatedVisit) =>
    set((state) => ({
      visits: state.visits.map((v) =>
        v.id === updatedVisit.id ? mergeVisit(v, updatedVisit) : v,
      ),
    })),

  syncCarryoverVisit: (updatedVisit) => {
    if (!updatedVisit?.id) return;
    set((state) => {
      const without = state.carryoverVisits.filter(
        (v) => v.id !== updatedVisit.id,
      );
      if (!belongsInCarryover(updatedVisit)) {
        return { carryoverVisits: without };
      }
      const merged = mergeVisit(
        state.carryoverVisits.find((v) => v.id === updatedVisit.id),
        updatedVisit,
      );
      return { carryoverVisits: [...without, merged] };
    });
  },

  startConsultation: async (visitId, doctorId) => {
    const updated = await visitService.startConsultation(visitId, {
      doctor_id: doctorId,
    });
    get().updateVisit(updated);
    get().syncCarryoverVisit(updated);
    return updated;
  },

  sendToPreparation: async (visitId, payload = {}) => {
    const updated = await visitService.sendToPreparation(visitId, payload);
    get().updateVisit(updated);
    get().syncCarryoverVisit(updated);
    return updated;
  },

  goToPreparation: async (visitId, payload = {}) => {
    const updated = await visitService.goToPreparation(visitId, payload);
    get().updateVisit(updated);
    get().syncCarryoverVisit(updated);
    return updated;
  },

  sendToTreatment: async (visitId, payload = {}) => {
    const updated = await visitService.sendToTreatment(visitId, payload);
    get().updateVisit(updated);
    get().syncCarryoverVisit(updated);
    return updated;
  },

  markTreatmentDone: async (visitId, payload = {}) => {
    const updated = await visitService.completeTreatment(visitId, payload);
    get().updateVisit(updated);
    get().syncCarryoverVisit(updated);
    return updated;
  },

  completePayment: async (visitId) => {
    const updated = await visitService.completePayment(visitId);
    get().updateVisit(updated);
    get().syncCarryoverVisit(updated);
    return updated;
  },

  cancelCarryoverVisit: async (visitId, payload) => {
    const updated = await visitService.cancelCarryoverVisit(visitId, payload);
    get().syncCarryoverVisit(updated);
    return updated;
  },

  createVisit: async (payload) => {
    const visit = await visitService.createVisit(payload);
    await get().fetchVisits();
    return visit;
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setDoctorFilter: (d) => set({ doctorFilter: d }),

  getFilteredVisits: (status) => {
    const { visits, searchQuery, doctorFilter } = get();
    return visits.filter((v) => {
      if (v.status !== status) return false;
      const patientName = v.patient?.name || v.patientName || "";
      if (
        searchQuery &&
        !patientName.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (doctorFilter && v.doctor_id !== Number(doctorFilter)) return false;
      return true;
    });
  },
}));

export default useLiveBoardStore;
