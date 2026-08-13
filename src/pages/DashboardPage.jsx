import { useMemo, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import { resolveUserPrimaryRole } from "../utils/workspaceRoutes";
import { DASHBOARD_ROLE_VARIANTS } from "./dashboard/dashboardConfig";
import useDashboardMetrics from "./dashboard/useDashboardMetrics";
import {
  DashboardErrorState,
  DashboardHeader,
  DashboardWorkspace,
} from "./dashboard/DashboardSections";

const PERIOD_LABEL_BY_KEY = {
  day: "Today",
  week: "This week",
  month: "This month",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [period, setPeriod] = useState("day");
  const { loading, error, metrics, reload } = useDashboardMetrics(period);

  const role = resolveUserPrimaryRole(user);
  const isAdminView = role === "admin";
  const variant = useMemo(
    () =>
      isAdminView
        ? DASHBOARD_ROLE_VARIANTS.admin
        : DASHBOARD_ROLE_VARIANTS.owner,
    [isAdminView],
  );

  const rolePrefix = isAdminView ? "/admin" : "/owner";
  const goToRelativePath = (path) => navigate(`${rolePrefix}/${path}`);

  return (
    <Box sx={{ pb: 3 }}>
      <DashboardHeader
        title={variant.title}
        subtitle={variant.subtitle}
        period={period}
        onPeriodChange={setPeriod}
        isAdminView={isAdminView}
      />

      <DashboardErrorState error={error} onRetry={reload} />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DashboardWorkspace
          metrics={metrics}
          periodLabel={PERIOD_LABEL_BY_KEY[period]}
          pendingActionsLabel={variant.pendingActionsLabel}
          workloadLabel={variant.workloadLabel}
          onOpen={goToRelativePath}
        />
      )}
    </Box>
  );
}
