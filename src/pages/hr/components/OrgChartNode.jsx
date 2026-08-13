import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Avatar, Box, Card, Chip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";

function OrgChartNode({ data, selected }) {
  const theme = useTheme();

  if (data?.isVirtual) {
    return (
      <>
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        <Card
          variant="outlined"
          sx={{
            width: 228,
            px: 2,
            py: 1.5,
            textAlign: "center",
            borderStyle: "dashed",
            bgcolor: alpha(theme.palette.text.primary, 0.04),
            borderColor: alpha(theme.palette.text.primary, 0.2),
          }}
        >
          <AccountTreeOutlinedIcon color="action" sx={{ mb: 0.5 }} />
          <Typography variant="subtitle2" fontWeight={700}>
            {data.label || "Organization"}
          </Typography>
        </Card>
      </>
    );
  }

  const staff = data?.staff;
  const isSyntheticManager = Boolean(data?.isSyntheticManager);
  const departmentName = data?.departmentName || "Unassigned";
  const departmentColor = data?.departmentColor;
  const accent = departmentColor?.accent ?? theme.palette.primary.main;
  const chipBg =
    theme.palette.mode === "dark"
      ? alpha(accent, 0.22)
      : departmentColor?.chipBg ?? alpha(theme.palette.primary.main, 0.12);
  const chipText =
    theme.palette.mode === "dark"
      ? theme.palette.common.white
      : departmentColor?.chipText ?? theme.palette.primary.dark;
  const positionLabel =
    staff?.staff_profile?.position_title || (isSyntheticManager ? "Leadership" : "No position");

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Card
        variant="outlined"
        sx={{
          width: 228,
          borderLeft: 4,
          borderLeftColor: accent,
          borderRadius: 2,
          overflow: "hidden",
          cursor: isSyntheticManager ? "default" : "pointer",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          transform: selected ? "scale(1.03)" : "none",
          boxShadow: selected ? 6 : 1,
          "&:hover": {
            transform: "scale(1.02)",
            boxShadow: 4,
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, p: 1.5 }}>
          <Avatar
            src={staff?.staff_profile?.avatar_url || undefined}
            alt={staff?.name || ""}
            sx={{ width: 48, height: 48 }}
          >
            {(staff?.name || "?").slice(0, 1)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap title={staff?.name}>
              {staff?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {positionLabel}
            </Typography>
            <Chip
              label={departmentName}
              size="small"
              sx={{
                mt: 0.75,
                height: 22,
                maxWidth: "100%",
                bgcolor: chipBg,
                color: chipText,
                fontWeight: 700,
                border: `1px solid ${alpha(accent, theme.palette.mode === "dark" ? 0.5 : 0.35)}`,
              }}
            />
          </Box>
        </Box>
      </Card>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

export default memo(OrgChartNode);
