import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import FitScreenOutlinedIcon from "@mui/icons-material/FitScreenOutlined";
import ZoomInOutlinedIcon from "@mui/icons-material/ZoomInOutlined";
import ZoomOutOutlinedIcon from "@mui/icons-material/ZoomOutOutlined";
import HrPageShell from "./components/HrPageShell";
import OrgChartCanvas from "./components/OrgChartCanvas";
import ReportingManagerDialog from "./components/ReportingManagerDialog";
import { getStaffs } from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import useSettingsStore from "../../stores/settingsStore";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";
import { buildOrgTreeData, staffNodeId } from "../../utils/buildOrgTreeData";

export default function OrganizationStructurePage() {
  const location = useLocation();
  const { pushToast } = useToastStore();
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [fitViewKey, setFitViewKey] = useState(0);
  const [dialogStaff, setDialogStaff] = useState(null);
  const canEditReporting = hasPermission(user, "hr.manage");

  const hrStaffListPath = location.pathname.replace(
    /\/organization$/,
    "/staff",
  );

  const organizationLabel = settings?.clinic_name?.trim() || "Organization";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await getStaffs();
      setStaff(payload);
    } catch (error) {
      pushToast({
        message: resolveApiError(
          error,
          "Failed to load organization structure.",
        ),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load, location.pathname]);

  const treeData = useMemo(
    () => buildOrgTreeData(staff, { organizationLabel }),
    [organizationLabel, staff],
  );

  const showEmptyState =
    !loading && treeData.staffCount > 0 && !treeData.hasReportingLines;

  const searchMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return staff
      .filter(
        (member) =>
          member.name?.toLowerCase().includes(query) ||
          member.staff_profile?.position_title?.toLowerCase().includes(query),
      )
      .map((member) => staffNodeId(member.id));
  }, [search, staff]);

  useEffect(() => {
    if (!search.trim()) {
      setHighlightedNodeId(null);
      return;
    }
    setHighlightedNodeId(searchMatches[0] ?? null);
  }, [search, searchMatches]);

  const handleNodeClick = useCallback((node) => {
    if (node.data?.isVirtual || node.data?.isSyntheticManager) return;
    const member = node.data?.staff;
    if (!member?.staff_profile) return;
    setDialogStaff(member);
  }, []);

  const handleDialogSaved = useCallback(async () => {
    await load();
    setFitViewKey((value) => value + 1);
  }, [load]);

  const bumpFitView = () => setFitViewKey((value) => value + 1);

  return (
    <HrPageShell
      title="Organization Structure"
      subtitle={
        treeData.hasReportingLines
          ? `Reporting lines · ${treeData.chartMemberCount ?? treeData.staffCount} in chart · ${treeData.staffCount} profiles`
          : `${treeData.staffCount} staff profiles`
      }
      guide={[
        "Visual organisation chart of departments and reporting lines across the clinic.",
        "Set each staff member's reporting manager on their profile to build the hierarchy.",
      ]}
      actions={
        <Button
          component={Link}
          to={hrStaffListPath}
          variant="outlined"
          size="small"
        >
          Staff profiles
        </Button>
      }
    >
      <Stack
        spacing={1.5}
        sx={{
          height: { xs: "calc(100vh - 250px)", md: "calc(100vh - 220px)" },
          minHeight: 480,
          mb: 2,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          <TextField
            size="small"
            placeholder="Search by name or position"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: "100%", sm: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountTreeOutlinedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title="Fit to screen">
              <IconButton
                size="small"
                onClick={bumpFitView}
                aria-label="Fit to screen"
              >
                <FitScreenOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refocus search match">
              <span>
                <IconButton
                  size="small"
                  disabled={!highlightedNodeId}
                  onClick={bumpFitView}
                  aria-label="Focus highlighted node"
                >
                  <ZoomInOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Reset highlight">
              <IconButton
                size="small"
                onClick={() => {
                  setSearch("");
                  setHighlightedNodeId(null);
                  bumpFitView();
                }}
                aria-label="Clear search"
              >
                <ZoomOutOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {loading ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : null}

        {!loading && showEmptyState ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              px: 2,
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <AccountTreeOutlinedIcon
              sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
            />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Build your organization chart
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 420, mb: 2 }}
            >
              Set <strong>Reporting Manager</strong> on staff profiles to
              connect reporting lines and display your clinic hierarchy here.
            </Typography>
            <Button component={Link} to={hrStaffListPath} variant="contained">
              Go to staff profiles
            </Button>
          </Box>
        ) : null}

        {!loading && !showEmptyState && treeData.nodes.length > 0 ? (
          <Typography variant="caption" color="text.secondary">
            Click a person to set or change their reporting manager.
          </Typography>
        ) : null}

        {!loading && !showEmptyState && treeData.nodes.length > 0 ? (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <OrgChartCanvas
              nodes={treeData.nodes}
              edges={treeData.edges}
              highlightedNodeId={highlightedNodeId}
              onNodeClick={handleNodeClick}
              fitViewKey={fitViewKey}
            />
          </Box>
        ) : null}

        {!loading && !showEmptyState && treeData.nodes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No active staff to display.
          </Typography>
        ) : null}

        {!loading && showEmptyState ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: "center" }}
          >
            Tip: open a staff profile from Staff Profiles to set the first
            reporting manager, then click nodes here to adjust the chart
            quickly.
          </Typography>
        ) : null}
      </Stack>

      <ReportingManagerDialog
        open={Boolean(dialogStaff)}
        staffMember={dialogStaff}
        staffList={staff}
        canEdit={canEditReporting}
        onClose={() => setDialogStaff(null)}
        onSaved={handleDialogSaved}
      />
    </HrPageShell>
  );
}
