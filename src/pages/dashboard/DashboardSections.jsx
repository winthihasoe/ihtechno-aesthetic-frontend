import { createElement, useId } from "react";
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import SpaOutlinedIcon from "@mui/icons-material/SpaOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AutoGraphOutlinedIcon from "@mui/icons-material/AutoGraphOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PieChartOutlineOutlinedIcon from "@mui/icons-material/PieChartOutlineOutlined";
import HealingOutlinedIcon from "@mui/icons-material/HealingOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import ChecklistRtlOutlinedIcon from "@mui/icons-material/ChecklistRtlOutlined";
import { DASHBOARD_PERIODS } from "./dashboardConfig";
import { formatKyats } from "../../utils/formatKyats";

function panelSx(theme) {
  return {
    bgcolor: "background.paper",
    boxShadow:
      theme.palette.mode === "dark"
        ? `0 1px 0 ${alpha("#fff", 0.04)}`
        : `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
  };
}

function TrendChip({ trend }) {
  if (!trend) return null;
  return (
    <Chip
      size="small"
      color={trend.direction === "up" ? "success" : "error"}
      label={trend.label}
      variant="outlined"
      sx={{ fontWeight: 700, height: 22, fontSize: "0.7rem" }}
    />
  );
}

function KpiTile({ title, value, footnote, icon, trend, accent }) {
  const theme = useTheme();
  return (
    <Card elevation={0} sx={{ height: "100%", ...panelSx(theme) }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          sx={{ mb: 1.25 }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, letterSpacing: "0.02em" }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(accent || theme.palette.primary.main, 0.12),
              color: accent || theme.palette.primary.main,
            }}
          >
            {createElement(icon, { sx: { fontSize: 18 } })}
          </Box>
        </Stack>
        <Stack
          direction="row"
          alignItems="baseline"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={0.75}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}
          >
            {value}
          </Typography>
          <TrendChip trend={trend} />
        </Stack>
        {footnote ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.75, display: "block", lineHeight: 1.4 }}
          >
            {footnote}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PanelHeader({ icon, title, hint, action }) {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={1}
      sx={{ mb: 1.5 }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        sx={{ minWidth: 0 }}
      >
        <Box
          sx={(theme) => ({
            width: 34,
            height: 34,
            borderRadius: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: "primary.main",
            flexShrink: 0,
          })}
        >
          {createElement(icon, { sx: { fontSize: 18 } })}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, lineHeight: 1.2 }}
          >
            {title}
          </Typography>
          {hint ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {hint}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      {action}
    </Stack>
  );
}

function DualAreaChart({ visitSeries, revenueSeries }) {
  const theme = useTheme();
  const visitFillId = useId().replace(/:/g, "");
  const revFillId = useId().replace(/:/g, "");
  const w = 720;
  const h = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 36 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const n = visitSeries.length;
  const maxVisit = Math.max(...visitSeries.map((d) => d.value), 1);
  const maxRev = Math.max(...revenueSeries.map((d) => d.value), 1);

  const toPoints = (series, maxV) =>
    series.map((d, i) => {
      const x = pad.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = pad.top + (1 - d.value / maxV) * innerH;
      return { x, y, ...d };
    });

  const visitPts = toPoints(visitSeries, maxVisit);
  const revPts = toPoints(revenueSeries, maxRev);
  const lineD = (pts) =>
    pts
      .map(
        (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      )
      .join(" ");
  const areaD = (pts) =>
    `${lineD(pts)} L ${pts[n - 1].x.toFixed(1)} ${pad.top + innerH} L ${pts[0].x.toFixed(1)} ${pad.top + innerH} Z`;

  const visitColor = theme.palette.primary.main;
  const revColor = theme.palette.success.main;

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: 0.5,
              bgcolor: visitColor,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Visits
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: revColor }}
          />
          <Typography variant="caption" color="text.secondary">
            Revenue index
          </Typography>
        </Stack>
      </Stack>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        role="img"
        aria-label="Visit and revenue trend"
      >
        <defs>
          <linearGradient id={visitFillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={visitColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={visitColor} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={revFillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={revColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={revColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + t * innerH;
          return (
            <line
              key={t}
              x1={pad.left}
              y1={y}
              x2={w - pad.right}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.08"
            />
          );
        })}
        <path d={areaD(visitPts)} fill={`url(#${visitFillId})`} />
        <path d={areaD(revPts)} fill={`url(#${revFillId})`} />
        <path
          d={lineD(visitPts)}
          fill="none"
          stroke={visitColor}
          strokeWidth="2.25"
          strokeLinecap="round"
        />
        <path
          d={lineD(revPts)}
          fill="none"
          stroke={revColor}
          strokeWidth="2.25"
          strokeLinecap="round"
        />
        {visitPts
          .filter((_, i) => i % 6 === 0 || i === n - 1)
          .map((p) => (
            <text
              key={`${p.key}-x`}
              x={p.x}
              y={h - 8}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              opacity="0.45"
            >
              {p.shortLabel}
            </text>
          ))}
      </svg>
    </Box>
  );
}

function HorizontalBarChart({ rows, barColor }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const w = 360;
  const rowH = 34;
  const labelW = 112;
  const barX = labelW + 8;
  const barW = w - barX - 36;
  const h = rows.length * rowH + 4;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      role="img"
      aria-label="Service popularity"
    >
      {rows.map((row, i) => {
        const y = 4 + i * rowH;
        const bw = (row.value / max) * barW;
        return (
          <g key={row.key}>
            <text
              x={0}
              y={y + 18}
              fontSize="11"
              fill="currentColor"
              opacity="0.8"
            >
              {row.label.length > 15 ? `${row.label.slice(0, 14)}…` : row.label}
            </text>
            <rect
              x={barX}
              y={y + 8}
              width={barW}
              height={10}
              rx={4}
              fill="currentColor"
              opacity="0.07"
            />
            <rect
              x={barX}
              y={y + 8}
              width={bw}
              height={10}
              rx={4}
              fill={barColor}
            />
            <text
              x={barX + barW + 6}
              y={y + 17}
              fontSize="11"
              fontWeight="700"
              fill="currentColor"
              opacity="0.55"
            >
              {row.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function VerticalBarChart({ series, barColor }) {
  const max = Math.max(...series.map((d) => d.value), 1);
  const w = 300;
  const h = 170;
  const pad = { l: 8, r: 8, t: 14, b: 26 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const n = series.length;
  const gap = 6;
  const bw = (innerW - gap * (n - 1)) / n;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      role="img"
      aria-label="Weekly volume"
    >
      {series.map((d, i) => {
        const x = pad.l + i * (bw + gap);
        const bh = (d.value / max) * innerH;
        const y = pad.t + innerH - bh;
        return (
          <g key={d.key}>
            <rect
              x={x}
              y={y}
              width={bw}
              height={bh}
              rx={3}
              fill={barColor}
              opacity={0.88}
            />
            <text
              x={x + bw / 2}
              y={h - 8}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              opacity="0.45"
            >
              {d.shortLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StackedBarChart({ series, completedColor, pendingColor }) {
  const max = Math.max(...series.map((d) => d.completed + d.pending), 1);
  const w = 300;
  const h = 170;
  const pad = { l: 8, r: 8, t: 14, b: 26 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const n = series.length;
  const gap = 6;
  const bw = (innerW - gap * (n - 1)) / n;

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 0.5 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: 0.5,
              bgcolor: completedColor,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Done
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: 0.5,
              bgcolor: pendingColor,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Pending
          </Typography>
        </Stack>
      </Stack>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        role="img"
        aria-label="Pre-treatment weekly stacked"
      >
        {series.map((d, i) => {
          const x = pad.l + i * (bw + gap);
          const doneH = (d.completed / max) * innerH;
          const pendH = (d.pending / max) * innerH;
          const yPend = pad.t + innerH - pendH;
          const yDone = yPend - doneH;
          return (
            <g key={d.key}>
              <rect
                x={x}
                y={yPend}
                width={bw}
                height={pendH}
                rx={2}
                fill={pendingColor}
                opacity={0.75}
              />
              <rect
                x={x}
                y={yDone}
                width={bw}
                height={doneH}
                rx={2}
                fill={completedColor}
                opacity={0.9}
              />
              <text
                x={x + bw / 2}
                y={h - 8}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                opacity="0.45"
              >
                {d.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

function DonutChart({ segments, size = 160 }) {
  const theme = useTheme();
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const stroke = size * 0.16;
  const palette = [
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
  ];

  const arcs = segments.reduce((acc, seg, i) => {
    const start = acc.length === 0 ? -Math.PI / 2 : acc[acc.length - 1].end;
    const sweep = (seg.value / total) * Math.PI * 2;
    const end = start + sweep;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    acc.push({
      ...seg,
      end,
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      color: seg.color || palette[i % palette.length],
    });
    return acc;
  }, []);

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems="center"
    >
      <Box
        sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Status mix"
        >
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={alpha(theme.palette.text.primary, 0.06)}
            strokeWidth={stroke}
          />
          {arcs.map((arc) => (
            <path
              key={arc.key}
              d={arc.d}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>
            {total}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            total
          </Typography>
        </Box>
      </Box>
      <Stack spacing={0.75} sx={{ flex: 1, width: "100%" }}>
        {segments.map((seg, i) => (
          <Stack
            key={seg.key}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: 0.5,
                  bgcolor: seg.color || palette[i % palette.length],
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" noWrap>
                {seg.label}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 700 }}
            >
              {seg.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

function EmptyList({ message }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
      {message}
    </Typography>
  );
}

export function DashboardHeader({
  title,
  subtitle,
  period,
  onPeriodChange,
  isAdminView,
}) {
  const theme = useTheme();
  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, letterSpacing: "-0.03em" }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 560 }}
          >
            {subtitle}
            <Box component="span" sx={{ opacity: 0.8 }}>
              {" "}
              · {isAdminView ? "Admin" : "Owner"}
            </Box>
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={period}
          onChange={(_, value) => {
            if (value) onPeriodChange(value);
          }}
          sx={{
            alignSelf: { xs: "stretch", sm: "center" },
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            "& .MuiToggleButton-root": {
              px: 2,
              fontWeight: 700,
              textTransform: "none",
              border: "none",
              "&.Mui-selected": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
              },
            },
          }}
        >
          {DASHBOARD_PERIODS.map((item) => (
            <ToggleButton key={item.key} value={item.key}>
              {item.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
    </Box>
  );
}

export function DashboardWorkspace({
  metrics,
  periodLabel,
  pendingActionsLabel,
  workloadLabel,
  onOpen,
}) {
  const theme = useTheme();
  const {
    kpis,
    appointmentMix,
    appointmentStatusMix,
    visitPipeline,
    inventory,
    lowStockList,
    pendingActions,
    staffWorkload,
    recentVisits,
    upcomingAppointments,
    charts,
  } = metrics;

  const mixFootnote = `${appointmentMix.completed} done · ${appointmentMix.cancelled} cancelled · ${appointmentMix.noShow} no-show`;
  const pipelineTotal = visitPipeline.reduce((s, r) => s + r.value, 0);

  return (
    <Stack spacing={2.5}>
      {/* KPI strip */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            xl: "repeat(6, minmax(0, 1fr))",
          },
          gap: 1.75,
        }}
      >
        <KpiTile
          title={`Patients (${periodLabel})`}
          value={kpis.uniquePatients.value}
          footnote="Unique with a visit in range"
          icon={Groups2OutlinedIcon}
          trend={kpis.uniquePatients.trend}
          accent={theme.palette.primary.main}
        />
        <KpiTile
          title={`Revenue (${periodLabel})`}
          value={formatKyats(kpis.revenue.value)}
          footnote="Completed visits paid in range"
          icon={PaymentsOutlinedIcon}
          trend={kpis.revenue.trend}
          accent={theme.palette.success.main}
        />
        <KpiTile
          title={`Appointments (${periodLabel})`}
          value={kpis.appointmentsBooked.value}
          footnote={mixFootnote}
          icon={EventNoteOutlinedIcon}
          trend={kpis.appointmentsBooked.trend}
          accent={theme.palette.info.main}
        />
        <KpiTile
          title={`Completed (${periodLabel})`}
          value={kpis.completedVisits.value}
          footnote="Visits closed in range"
          icon={ChecklistRtlOutlinedIcon}
          trend={kpis.completedVisits.trend}
          accent={theme.palette.secondary.main}
        />
        <KpiTile
          title="Avg ticket"
          value={formatKyats(kpis.avgTicket.value)}
          footnote="Revenue ÷ completed visits"
          icon={ReceiptLongOutlinedIcon}
          accent={theme.palette.warning.main}
        />
        <KpiTile
          title="Active on floor"
          value={kpis.activeOnFloor}
          footnote="Live visits not completed"
          icon={SpaOutlinedIcon}
          accent={theme.palette.error.main}
        />
      </Box>

      {/* Main analytics + pipeline */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 1.6fr) minmax(0, 1fr)",
          },
          gap: 2,
        }}
      >
        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent>
            <PanelHeader
              icon={AutoGraphOutlinedIcon}
              title="Visit & revenue trend"
              hint="Last 30 days · illustrative series"
              action={<Chip label="Demo" size="small" variant="outlined" />}
            />
            <DualAreaChart
              visitSeries={charts.visitTrend}
              revenueSeries={charts.revenueTrend}
            />
          </CardContent>
        </Card>

        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent>
            <PanelHeader
              icon={PieChartOutlineOutlinedIcon}
              title="Visit pipeline"
              hint={`${pipelineTotal} active on floor`}
            />
            {pipelineTotal === 0 ? (
              <EmptyList message="No active visits in the pipeline." />
            ) : (
              <Stack spacing={1.5}>
                {visitPipeline.map((row) => (
                  <Box key={row.key}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ mb: 0.5 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {row.value} · {row.pct}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={row.pct}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: alpha(row.color, 0.12),
                        "& .MuiLinearProgress-bar": {
                          bgcolor: row.color,
                          borderRadius: 1,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Secondary charts */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent>
            <PanelHeader
              icon={BarChartOutlinedIcon}
              title="Top services"
              hint="Relative visit volume"
              action={<Chip label="Demo" size="small" variant="outlined" />}
            />
            <HorizontalBarChart
              rows={charts.servicePopularity}
              barColor={theme.palette.primary.main}
            />
          </CardContent>
        </Card>

        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent>
            <PanelHeader
              icon={PieChartOutlineOutlinedIcon}
              title="Appointment mix"
              hint={periodLabel}
            />
            {appointmentStatusMix.length === 0 ? (
              <EmptyList message="No appointments in this period." />
            ) : (
              <DonutChart segments={appointmentStatusMix} size={148} />
            )}
          </CardContent>
        </Card>

        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent>
            <PanelHeader
              icon={SpaOutlinedIcon}
              title="Pre-treatment volume"
              hint="Last 7 days"
              action={<Chip label="Demo" size="small" variant="outlined" />}
            />
            <StackedBarChart
              series={charts.labWeekly}
              completedColor={theme.palette.info.main}
              pendingColor={alpha(theme.palette.warning.main, 0.85)}
            />
          </CardContent>
        </Card>

        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent>
            <PanelHeader
              icon={HealingOutlinedIcon}
              title="Treatment pulse"
              hint="Session index · 7 days"
              action={<Chip label="Demo" size="small" variant="outlined" />}
            />
            <VerticalBarChart
              series={charts.pharmacyWeekly}
              barColor={theme.palette.secondary.main}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Care packages + attention + inventory */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
          },
          gap: 2,
        }}
      >
        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent>
            <PanelHeader
              icon={TrendingUpOutlinedIcon}
              title="Care packages"
              hint="Redemptions · 7 days"
              action={<Chip label="Demo" size="small" variant="outlined" />}
            />
            <VerticalBarChart
              series={charts.packageWeekly}
              barColor={theme.palette.info.main}
            />
          </CardContent>
        </Card>

        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent>
            <PanelHeader
              icon={WarningAmberIcon}
              title={pendingActionsLabel}
              hint="Action queue"
            />
            {pendingActions.length === 0 ? (
              <EmptyList message="Nothing queued — operations look calm." />
            ) : (
              <Stack spacing={1}>
                {pendingActions.map((item) => (
                  <Box
                    key={item.key}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      py: 0.75,
                      px: 1,
                      borderRadius: 1.5,
                      bgcolor: alpha(
                        theme.palette[item.severity]?.main ||
                          theme.palette.warning.main,
                        0.06,
                      ),
                    }}
                  >
                    <Typography variant="body2" sx={{ minWidth: 0 }} noWrap>
                      {item.label}
                    </Typography>
                    <Button
                      size="small"
                      color={item.severity || "primary"}
                      endIcon={<OpenInNewIcon fontSize="inherit" />}
                      onClick={() => onOpen(item.path)}
                      sx={{ fontWeight: 700, flexShrink: 0 }}
                    >
                      {item.value}
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent>
            <PanelHeader
              icon={Inventory2OutlinedIcon}
              title="Inventory signals"
              hint={`${inventory.lowStock} low · ${inventory.outOfStock} out`}
              action={
                <Button
                  size="small"
                  endIcon={<OpenInNewIcon />}
                  onClick={() => onOpen("inventory")}
                >
                  Open
                </Button>
              }
            />
            {lowStockList.length === 0 ? (
              <EmptyList message="No low-stock alerts right now." />
            ) : (
              <Stack spacing={1}>
                {lowStockList.map((row) => (
                  <Stack
                    key={row.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                    sx={{ py: 0.5, borderBottom: 1, borderColor: "divider" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600 }}
                        noWrap
                      >
                        {row.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.sku}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={row.status === "out" ? "Out" : `Qty ${row.qty}`}
                      color={row.status === "out" ? "error" : "warning"}
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Lists: recent visits + upcoming appointments + workload */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 1.4fr) minmax(0, 1.2fr) minmax(0, 1fr)",
          },
          gap: 2,
        }}
      >
        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent sx={{ pb: "16px !important" }}>
            <PanelHeader
              icon={SpaOutlinedIcon}
              title="Recent visits"
              hint="Latest activity"
              action={
                <Button
                  size="small"
                  endIcon={<OpenInNewIcon />}
                  onClick={() => onOpen("visit-history")}
                >
                  All visits
                </Button>
              }
            />
            {recentVisits.length === 0 ? (
              <EmptyList message="No visits found." />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Patient</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Doctor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Amount
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentVisits.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.patient}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {row.doctor}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.statusLabel}
                            sx={{
                              fontWeight: 700,
                              bgcolor: row.statusColor,
                              color: row.statusTextColor,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {row.amount ? formatKyats(row.amount) : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ whiteSpace: "nowrap" }}
                          >
                            {row.at}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent sx={{ pb: "16px !important" }}>
            <PanelHeader
              icon={ScheduleOutlinedIcon}
              title="Upcoming appointments"
              hint="Next scheduled"
              action={
                <Button
                  size="small"
                  endIcon={<OpenInNewIcon />}
                  onClick={() => onOpen("appointments")}
                >
                  Calendar
                </Button>
              }
            />
            {upcomingAppointments.length === 0 ? (
              <EmptyList message="No upcoming appointments." />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Patient</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Doctor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>When</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upcomingAppointments.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.patient}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {row.doctor}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ maxWidth: 120 }}
                          >
                            {row.reason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ whiteSpace: "nowrap" }}
                          >
                            {row.at}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        <Card elevation={0} sx={panelSx(theme)}>
          <CardContent>
            <PanelHeader
              icon={Groups2OutlinedIcon}
              title={workloadLabel}
              hint="Active visits by assignee"
            />
            {staffWorkload.length === 0 ? (
              <EmptyList message="No in-flight visits with assignees." />
            ) : (
              <Stack spacing={1.5}>
                {staffWorkload.map((item) => {
                  const maxCount = staffWorkload[0]?.count || 1;
                  const pct = Math.round((item.count / maxCount) * 100);
                  return (
                    <Box key={`${item.role}-${item.name}`}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.name}{" "}
                          <Box
                            component="span"
                            sx={{ fontWeight: 500, color: "text.secondary" }}
                          >
                            ({item.role})
                          </Box>
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontWeight: 700 }}
                        >
                          {item.count}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ height: 7, borderRadius: 1 }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}

export function DashboardErrorState({ error, onRetry }) {
  if (!error) return null;
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Retry
        </Button>
      }
      sx={{ mb: 2 }}
    >
      {error}
    </Alert>
  );
}
