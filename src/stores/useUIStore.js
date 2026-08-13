import { create } from "zustand";

const useUIStore = create((set) => ({
  drawerOpen: false,
  drawerContext: "consulting",
  selectedVisitId: null,

  openDrawer: (visitId, context = "consulting") =>
    set({ drawerOpen: true, selectedVisitId: visitId, drawerContext: context }),

  closeDrawer: () =>
    set({ drawerOpen: false, selectedVisitId: null, drawerContext: "consulting" }),
}));

export default useUIStore;
