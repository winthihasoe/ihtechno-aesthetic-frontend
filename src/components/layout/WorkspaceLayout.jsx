import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import AppTopNav from "./AppTopNav";
import ContextualSidebar from "./ContextualSidebar";
import MobileSubNav from "./MobileSubNav";
import MobileBottomNav from "./MobileBottomNav";
import MobileMoreSheet from "./MobileMoreSheet";
import useWorkspaceNav from "./useWorkspaceNav";
import VisitDrawer from "../LiveBoard/VisitDrawer";
import useLiveBoardStore from "../../stores/liveBoardStore";
import useNotificationStore from "../../stores/notificationStore";
import useAuthStore from "../../stores/authStore";
import { isImmersiveWorkspacePath } from "../../utils/immersiveRoutes";
import { getOutletBackgroundLight } from "../../theme/brandColors";
import MyHrAssignmentTasksBanner from "../../pages/hr/components/MyHrAssignmentTasksBanner";

const DRAWER_WIDTH = 220;

/**
 * @param {{ scrollContainerSx?: import("@mui/material").SxProps }} [props]
 */
export default function WorkspaceLayout({ scrollContainerSx } = {}) {
  const { pathname } = useLocation();
  const immersive = isImmersiveWorkspacePath(pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isRealtimeHealthy, setIsRealtimeHealthy] = useState(
    Boolean(window.Echo),
  );
  const { updateVisit, addVisit, fetchVisits } = useLiveBoardStore();
  const { addNotification } = useNotificationStore();
  const { token } = useAuthStore();
  const {
    sections,
    activeSection,
    showContextualSidebar,
    sidebarItems,
    mobilePrimarySections,
    mobileMoreSections,
    mobileSubNavItems,
    selectSection,
  } = useWorkspaceNav();

  useEffect(() => {
    if (!token) return;
    if (!window.Echo) {
      return;
    }

    if (window.Echo.connector?.options?.auth?.headers) {
      window.Echo.connector.options.auth.headers.Authorization = `Bearer ${token}`;
      window.Echo.connector.options.auth.headers.Accept = "application/json";
    }

    const connection = window.Echo.connector?.pusher?.connection;
    const syncConnectionHealth = () => {
      const state = connection?.state ?? "unavailable";
      setIsRealtimeHealthy(state === "connected" || state === "connecting");
    };
    syncConnectionHealth();

    const handleStateChange = ({ current }) => {
      setIsRealtimeHealthy(current === "connected" || current === "connecting");
      if (current === "connected") {
        fetchVisits({ background: true });
      }
    };
    connection?.bind("state_change", handleStateChange);

    const channelName = "clinic";
    const channel = window.Echo.private(channelName);

    channel.listen(".VisitCreated", (e) => {
      if (e.visit) addVisit(e.visit);
      addNotification(`New patient arrived: ${e.visit?.patient?.name ?? ""}`);
    });

    channel.listen(".StatusChanged", (e) => {
      if (e.visit) updateVisit(e.visit);
      if (e.new_status)
        addNotification(`Visit status changed to ${e.new_status}`);
    });

    channel.listen(".ConsultationCreated", (e) => {
      if (e.visit) updateVisit(e.visit);
      addNotification(
        `Consultation updated: ${e.visit?.patient?.name ?? "Patient"}`,
      );
    });

    channel.listen(".TreatmentUpdated", (e) => {
      if (e.visit) updateVisit(e.visit);
      addNotification(
        `Treatment updated: ${e.visit?.patient?.name ?? "Patient"}`,
      );
    });

    channel.listen(".PaymentUpdated", (e) => {
      if (e.visit) updateVisit(e.visit);
      addNotification(
        `Payment updated: ${e.visit?.patient?.name ?? "Patient"}`,
      );
    });

    channel.listen(".PaymentCompleted", (e) => {
      if (e.visit) updateVisit(e.visit);
      addNotification(
        `Payment completed: ${e.visit?.patient?.name ?? "Patient"}`,
      );
    });

    channel.listen(".VisitUpdated", (e) => {
      if (e.visit) updateVisit(e.visit);
    });

    return () => {
      channel.stopListening(".VisitCreated");
      channel.stopListening(".StatusChanged");
      channel.stopListening(".ConsultationCreated");
      channel.stopListening(".TreatmentUpdated");
      channel.stopListening(".PaymentUpdated");
      channel.stopListening(".PaymentCompleted");
      channel.stopListening(".VisitUpdated");
      window.Echo.leave(channelName);
      connection?.unbind("state_change", handleStateChange);
    };
  }, [token, updateVisit, addVisit, addNotification, fetchVisits]);

  useEffect(() => {
    if (!token || isRealtimeHealthy) return;
    const poll = setInterval(() => {
      fetchVisits({ background: true });
    }, 10000);

    return () => clearInterval(poll);
  }, [token, isRealtimeHealthy, fetchVisits]);

  const scrollArea = (
    <Box
      id="workspace-scroll-container"
      sx={[
        (theme) => ({
          flexGrow: 1,
          px: { xs: 1, sm: 1.5 },
          pt: 2,
          pb: {
            xs: "calc(52px + 24px + env(safe-area-inset-bottom, 0px))",
            sm: 4,
          },
          minWidth: 0,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          ...(theme.palette.mode === "light"
            ? {
                backgroundColor: "#ffffff",
                backgroundImage: getOutletBackgroundLight(),
                backgroundAttachment: "local",
              }
            : {}),
        }),
        ...(scrollContainerSx ? [scrollContainerSx] : []),
      ]}
    >
      <MyHrAssignmentTasksBanner />
      <Outlet />
    </Box>
  );

  if (immersive) {
    return (
      <Box
        id="workspace-layout-root"
        sx={(theme) => ({
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          bgcolor:
            theme.palette.mode === "light"
              ? "transparent"
              : "background.default",
          overflow: "hidden",
          overscrollBehavior: "none",
        })}
      >
        {scrollArea}
        <VisitDrawer />
      </Box>
    );
  }

  return (
    <Box
      id="workspace-layout-root"
      sx={(theme) => ({
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        bgcolor:
          theme.palette.mode === "light" ? "transparent" : "background.default",
        overflow: "hidden",
        overscrollBehavior: "none",
      })}
    >
      <AppTopNav
        sections={sections}
        activeSection={activeSection}
        onSectionChange={selectSection}
        onMenuClick={() => setMoreOpen(true)}
        showSectionTabs={sections.length > 0}
      />

      <MobileSubNav items={mobileSubNavItems} />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        {showContextualSidebar ? (
          <ContextualSidebar items={sidebarItems} drawerWidth={DRAWER_WIDTH} />
        ) : null}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {scrollArea}
        </Box>
      </Box>

      <MobileBottomNav
        primarySections={mobilePrimarySections}
        activeSection={activeSection}
        onSectionSelect={selectSection}
        onMoreClick={() => setMoreOpen(true)}
      />

      <MobileMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        sections={mobileMoreSections}
      />

      <VisitDrawer />
    </Box>
  );
}
