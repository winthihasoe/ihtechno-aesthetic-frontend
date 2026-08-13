import { createElement, useId } from "react";
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import HotelClassOutlinedIcon from "@mui/icons-material/HotelClassOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AutoGraphOutlinedIcon from "@mui/icons-material/AutoGraphOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import CardGiftcardOutlinedIcon from "@mui/icons-material/CardGiftcardOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import MedicalServicesOutlinedIcon from "@mui/icons-material/MedicalServicesOutlined";
import dayjs from "dayjs";
import { DASHBOARD_PERIODS } from "./dashboardConfig";
import { formatKyats } from "../../utils/formatKyats";

const FOLLOW_STATUS_LABEL = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Done",
  skipped: "Skipped",
};

const FOLLOW_TYPE_LABEL = {
  treatment: "Treatment",
  package: "Package",
  after_service: "After service",
};

/**
 * Frosted panels tuned to the theme canvas (not a bright “steel” sheet).
 * Light: stays in the purple `background.default` family with a faint lift.
 * Dark: stays near `background.paper` / default with minimal cool highlight.
 */
function glassPanelSx(theme) {
  const isDark = theme.palette.mode === "dark";
  const canvas = theme.palette.background.default;
  const paper = theme.palette.background.paper;

  if (isDark) {
    const top = alpha(paper, 0.94);
    const bottom = alpha(canvas, 0.92);
    return {
      border: 1,
      borderColor: "divider",
      background: [
        `linear-gradient(180deg, ${alpha("#ffffff", 0.035)} 0%, transparent 42%)`,
        `linear-gradient(180deg, ${top} 0%, ${alpha(paper, 0.88)} 48%, ${bottom} 100%)`,
      ].join(","),
      backdropFilter: "blur(12px) saturate(1.05)",
      WebkitBackdropFilter: "blur(12px) saturate(1.05)",
      boxShadow: `inset 0 1px 0 ${alpha("#ffffff", 0.045)}`,
    };
  }

  const top = alpha(canvas, 0.9);
  const mid = alpha(canvas, 0.84);
  const bottom = alpha(canvas, 0.78);
  return {
    border: 1,
    borderColor: alpha("#ffffff", 0.12),
    background: [
      `linear-gradient(180deg, ${alpha("#ffffff", 0.07)} 0%, transparent 36%)`,
      `linear-gradient(180deg, ${top} 0%, ${mid} 45%, ${bottom} 100%)`,
    ].join(","),
    backdropFilter: "blur(14px) saturate(1.06)",
    WebkitBackdropFilter: "blur(14px) saturate(1.06)",
    boxShadow: `inset 0 1px 0 ${alpha("#ffffff", 0.1)}`,
  };
}

function glassInsetSx(theme) {
  const isDark = theme.palette.mode === "dark";
  const canvas = theme.palette.background.default;
  const paper = theme.palette.background.paper;

  if (isDark) {
    return {
      border: 1,
      borderColor: "divider",
      background: alpha(paper, 0.55),
      backdropFilter: "blur(8px) saturate(1.02)",
      WebkitBackdropFilter: "blur(8px) saturate(1.02)",
    };
  }

  return {
    border: 1,
    borderColor: alpha("#ffffff", 0.1),
    background: alpha(canvas, 0.58),
    backdropFilter: "blur(8px) saturate(1.02)",
    WebkitBackdropFilter: "blur(8px) saturate(1.02)",
  };
}

/** Softer white / light foreground so type separates from purple-tinted glass surfaces. */
function dashboardSurfaceTextSx(theme) {
  const isDark = theme.palette.mode === "dark";
  if (isDark) {
    const onCard = alpha(theme.palette.text.primary, 0.99);
    const onCardMuted = alpha(theme.palette.text.primary, 0.78);
    return {
      color: onCard,
      "& .MuiTypography-colorTextSecondary": {
        color: `${onCardMuted} !important`,
      },
      "& .MuiCard-root, & .MuiCardContent-root": {
        color: onCard,
      },
      "& .MuiCard-root .MuiTypography-root": {
        color: `${onCard} !important`,
      },
      "& .MuiCard-root .MuiTypography-colorTextSecondary": {
        color: `${onCardMuted} !important`,
      },
      "& .MuiCard-root .MuiButton-root.MuiButton-outlined": {
        color: onCard,
        borderColor: alpha(theme.palette.common.white, 0.35),
      },
      "& .MuiCard-root .MuiButton-root.MuiButton-text": {
        color: onCard,
      },
      "& .MuiToggleButtonGroup-root .MuiToggleButton-root": {
        color: alpha(theme.palette.text.primary, 0.88),
        "&:hover": {
          bgcolor: alpha(theme.palette.common.white, 0.06),
        },
        "&.Mui-selected": {
          color: theme.palette.primary.contrastText,
        },
      },
      "& .MuiChip-colorDefault": {
        color: alpha(theme.palette.text.primary, 0.88),
        borderColor: alpha(theme.palette.text.primary, 0.28),
      },
      "& .MuiDivider-root": {
        borderColor: alpha(theme.palette.divider, 0.9),
      },
    };
  }

  const cardFg = alpha("#ffffff", 0.98);
  const cardFgMuted = alpha("#ffffff", 0.82);

  return {
    color: cardFg,
    "& .MuiTypography-colorTextSecondary": {
      color: `${cardFgMuted} !important`,
    },
    "& .MuiCard-root, & .MuiCardContent-root": {
      color: cardFg,
    },
    "& .MuiCard-root .MuiTypography-root": {
      color: `${cardFg} !important`,
    },
    "& .MuiCard-root .MuiTypography-colorTextSecondary": {
      color: `${cardFgMuted} !important`,
    },
    "& .MuiCard-root .MuiButton-root.MuiButton-outlined": {
      color: cardFg,
      borderColor: alpha("#ffffff", 0.45),
    },
    "& .MuiCard-root .MuiButton-root.MuiButton-text": {
      color: cardFg,
    },
    "& .MuiToggleButtonGroup-root .MuiToggleButton-root": {
      color: alpha("#ffffff", 0.92),
      borderColor: alpha("#ffffff", 0.22),
      "&:hover": {
        bgcolor: alpha("#ffffff", 0.08),
      },
      "&.Mui-selected": {
        color: alpha("#2E1C34", 0.95),
        bgcolor: alpha("#ffffff", 0.92),
        "&:hover": {
          bgcolor: alpha("#ffffff", 0.88),
        },
      },
    },
    "& .MuiChip-colorDefault": {
      color: alpha("#ffffff", 0.92),
      borderColor: alpha("#ffffff", 0.38),
    },
    "& .MuiDivider-root": {
      borderColor: alpha("#ffffff", 0.16),
    },
  };
}

function formatPct(ratio) {
  if (ratio == null) return "—";
  return `${(ratio * 100).toFixed(1)}%`;
}

function KpiBand({ title, subtitle, columns, children }) {
  const gridColumns = columns ?? {
    xs: "1fr",
    sm: "repeat(2, minmax(0, 1fr))",
    lg: "repeat(4, minmax(0, 1fr))",
    xl: "repeat(5, minmax(0, 1fr))",
  };

  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ fontWeight: 800, letterSpacing: "0.12em", opacity: 0.82 }}
      >
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 0.5 }}>
          {subtitle}
        </Typography>
      ) : (
        <Box sx={{ mb: 2 }} />
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: gridColumns,
          gap: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function TrendChip({ trend }) {
  return (
    <Chip
      size="small"
      color={trend.direction === "up" ? "success" : "error"}
      label={trend.label}
      variant="outlined"
      sx={{ fontWeight: 600 }}
    />
  );
}

function KpiTile({ title, value, footnote, icon, trend }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const iconBg = alpha("#ffffff", isDark ? 0.1 : 0.14);
  const iconFg = alpha("#ffffff", isDark ? 0.95 : 0.98);
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        borderRadius: 2,
        overflow: "hidden",
        position: "relative",
        ...glassPanelSx(theme),
        bgcolor: "background.paper",
      }}
    >
      <CardContent sx={{ position: "relative" }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 700, pr: 1 }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: iconBg,
              color: iconFg,
            }}
          >
            {createElement(icon, { fontSize: "small" })}
          </Box>
        </Stack>
        <Stack
          direction="row"
          alignItems="baseline"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
        >
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, letterSpacing: "-0.03em" }}
          >
            {value}
          </Typography>
          {trend ? <TrendChip trend={trend} /> : null}
        </Stack>
        {footnote ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block", lineHeight: 1.5 }}
          >
            {footnote}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AreaLineChart({ series, stroke, dotStroke }) {
  const fillId = useId().replace(/:/g, "");
  const w = 640;
  const h = 200;
  const pad = { top: 16, right: 10, bottom: 30, left: 40 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const maxV = Math.max(...series.map((d) => d.value), 1);
  const minV = Math.min(...series.map((d) => d.value), maxV);
  const span = maxV - minV || 1;
  const n = series.length;
  const points = series.map((d, i) => {
    const x = pad.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const yNorm = (d.value - minV) / span;
    const y = pad.top + (1 - yNorm) * innerH;
    return { x, y, ...d };
  });
  const lineD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaD = `${lineD} L ${points[n - 1].x.toFixed(1)} ${pad.top + innerH} L ${points[0].x.toFixed(
    1,
  )} ${pad.top + innerH} Z`;

  return (
    <Box sx={{ width: "100%", color: "inherit", opacity: 0.92 }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        role="img"
        aria-label="Treatment activity trend"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.38" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + t * innerH;
          const v = Math.round(maxV - t * span);
          return (
            <g key={t}>
              <line
                x1={pad.left}
                y1={y}
                x2={w - pad.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.07"
              />
              <text
                x={4}
                y={y + 4}
                fontSize="10"
                fill="currentColor"
                opacity="0.4"
              >
                {v}
              </text>
            </g>
          );
        })}
        <path d={areaD} fill={`url(#${fillId})`} stroke="none" />
        <path
          d={lineD}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <circle
            key={p.key}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={stroke}
            stroke={dotStroke}
            strokeWidth="1.5"
          />
        ))}
        {points
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
  const rowH = 36;
  const labelW = 118;
  const barX = labelW + 8;
  const barW = w - barX - 36;
  const h = rows.length * rowH + 8;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      role="img"
      aria-label="Treatment popularity"
    >
      {rows.map((row, i) => {
        const y = 6 + i * rowH;
        const bw = (row.value / max) * barW;
        return (
          <g key={row.key}>
            <text
              x={0}
              y={y + 20}
              fontSize="11"
              fill="currentColor"
              opacity="0.85"
            >
              {row.label.length > 16 ? `${row.label.slice(0, 15)}…` : row.label}
            </text>
            <rect
              x={barX}
              y={y + 8}
              width={barW}
              height={10}
              rx={5}
              fill="currentColor"
              opacity="0.08"
            />
            <rect
              x={barX}
              y={y + 8}
              width={bw}
              height={10}
              rx={5}
              fill={barColor}
            />
            <text
              x={barX + barW + 6}
              y={y + 18}
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
  const w = 320;
  const h = 180;
  const pad = { l: 8, r: 8, t: 16, b: 28 };
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
      aria-label="Package demand trend"
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
              rx={4}
              fill={barColor}
              opacity={0.85}
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

function SectionLabel({ icon, title, hint }) {
  const theme = useTheme();
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "inherit",
          opacity: 0.85,
          ...glassInsetSx(theme),
        }}
      >
        {createElement(icon, { fontSize: "small" })}
      </Box>
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          {title}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        ) : null}
      </Box>
    </Stack>
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
    <Box
      sx={{
        borderRadius: 3,
        p: { xs: 2.5, md: 3 },
        mb: 3,
        ...glassPanelSx(theme),
        ...dashboardSurfaceTextSx(theme),
        bgcolor: "background.paper",
      }}
    >
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
            sx={{ mt: 0.75, maxWidth: 520 }}
          >
            {subtitle}
            <Box component="span" sx={{ opacity: 0.85 }}>
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
          sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
        >
          {DASHBOARD_PERIODS.map((item) => (
            <ToggleButton
              key={item.key}
              value={item.key}
              sx={{ px: 2, fontWeight: 600 }}
            >
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
  showFinancialSnapshots = true,
  onOpen,
}) {
  const theme = useTheme();
  const {
    kpis,
    followUp,
    inventory,
    pendingActions,
    staffWorkload,
    charts,
    monthlySummary,
  } = metrics;

  const { activity, money } = kpis;

  return (
    <Stack spacing={3.5} sx={(t) => ({ ...dashboardSurfaceTextSx(t) })}>
      <KpiBand
        title="Activity"
        subtitle={`Operational throughput for ${periodLabel.toLowerCase()}.`}
        columns={{
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        }}
      >
        <KpiTile
          title={`Unique customers (${periodLabel})`}
          value={activity.uniquePatients.value}
          footnote={`${activity.uniquePatients.newPatients} new · ${activity.uniquePatients.returningPatients} returning`}
          icon={Groups2OutlinedIcon}
          trend={activity.uniquePatients.trend}
        />
        <KpiTile
          title={`Treatment sessions (${periodLabel})`}
          value={activity.treatmentSessions.value}
          footnote="Completed treatment sessions in range"
          icon={MedicalServicesOutlinedIcon}
          trend={activity.treatmentSessions.trend}
        />
        <KpiTile
          title={`Appointments booked (${periodLabel})`}
          value={activity.appointmentsBooked.value}
          footnote={activity.appointmentsBooked.mixFootnote}
          icon={EventNoteOutlinedIcon}
          trend={activity.appointmentsBooked.trend}
        />
        <KpiTile
          title="Active on floor"
          value={activity.activeOnFloor.value}
          footnote="Live visits not completed — point in time"
          icon={HotelClassOutlinedIcon}
        />
      </KpiBand>

      <KpiBand
        title="Money"
        subtitle={`Invoiced revenue, cash collected, and profitability for ${periodLabel.toLowerCase()}.`}
        columns={{
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(3, minmax(0, 1fr))",
        }}
      >
        <KpiTile
          title={`Revenue (${periodLabel})`}
          value={formatKyats(money.revenue.value)}
          footnote={
            money.revenue.avgPerPatient != null
              ? `${formatKyats(money.revenue.avgPerPatient)} avg per patient`
              : "Avg per patient: —"
          }
          icon={PaymentsOutlinedIcon}
          trend={money.revenue.trend}
        />
        <KpiTile
          title={`Collections (${periodLabel})`}
          value={formatKyats(money.collections.value)}
          footnote={`Realization ${formatPct(money.collections.realizationPct)} of invoiced revenue`}
          icon={AccountBalanceWalletOutlinedIcon}
          trend={money.collections.trend}
        />
        {showFinancialSnapshots ? (
          <KpiTile
            title={`Net profit (${periodLabel})`}
            value={formatKyats(money.netProfit.value)}
            footnote={`Margin ${formatPct(money.netProfit.marginPct)} of revenue`}
            icon={AutoGraphOutlinedIcon}
            trend={money.netProfit.trend}
          />
        ) : null}
      </KpiBand>

      {showFinancialSnapshots ? (
        <KpiBand
          title="Position"
          subtitle="Balances as of now — receivables patients owe you, and liabilities you still owe."
          columns={{
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          }}
        >
          <KpiTile
            title="Outstanding receivables"
            value={formatKyats(money.receivables.value)}
            footnote="As of now — unpaid invoice balance (AR asset)"
            icon={ReceiptLongOutlinedIcon}
          />
          <KpiTile
            title="Total liabilities"
            value={formatKyats(money.totalLiabilities.value)}
            footnote={
              money.totalLiabilities.supplierPayables > 0
                ? `As of now — GL liabilities · AP ${formatKyats(money.totalLiabilities.supplierPayables)}`
                : "As of now — AP, deposits, tax & other GL liabilities"
            }
            icon={AccountBalanceOutlinedIcon}
          />
          <KpiTile
            title="Deferred package liability"
            value={formatKyats(money.packageLiability.value)}
            footnote={
              money.totalLiabilities.customerDepositGl > 0
                ? `As of now — unredeemed packages · GL deposit ${formatKyats(money.totalLiabilities.customerDepositGl)}`
                : "As of now — unredeemed package value (Customer Deposit)"
            }
            icon={CardGiftcardOutlinedIcon}
          />
        </KpiBand>
      ) : null}
      {/* Analytics row */}
      <Box>
        <Typography
          variant="overline"
          sx={{ fontWeight: 800, letterSpacing: "0.12em", opacity: 0.82 }}
        >
          Demand & packages
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, mt: 0.5 }}
        >
          Live treatment activity, popularity for the selected period, and
          package purchases over the last 7 days.
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          <Card elevation={0} sx={{ borderRadius: 3, ...glassPanelSx(theme) }}>
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <AutoGraphOutlinedIcon color="secondary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Treatment activity
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Last 30 days — completed sessions per day
              </Typography>
              <AreaLineChart
                series={charts.treatmentTrend}
                stroke={theme.palette.secondary.main}
                dotStroke={
                  theme.palette.mode === "dark"
                    ? theme.palette.background.paper
                    : alpha("#ffffff", 0.92)
                }
              />
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 3, ...glassPanelSx(theme) }}>
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <BarChartOutlinedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Popular treatments
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Top treatments in {periodLabel.toLowerCase()}
              </Typography>
              <HorizontalBarChart
                rows={charts.treatmentPopularity}
                barColor={theme.palette.primary.main}
              />
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              gridColumn: { xl: "span 1" },
              ...glassPanelSx(theme),
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <CardGiftcardOutlinedIcon color="info" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Package pulse
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Last 7 days — package purchases
              </Typography>
              <VerticalBarChart
                series={charts.packageWeekly}
                barColor={theme.palette.info.main}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {monthlySummary ? (
        <Box>
          <Typography
            variant="overline"
            sx={{ fontWeight: 800, letterSpacing: "0.12em", opacity: 0.82 }}
          >
            Monthly overview
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, mt: 0.5 }}
          >
            Top treatments and commission leaders for {dayjs().format("MMMM YYYY")}.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <Card
              elevation={0}
              sx={{ borderRadius: 3, ...glassPanelSx(theme) }}
            >
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  Top treatments
                </Typography>
                {(monthlySummary.rankings?.top_treatments ?? []).length ===
                0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No completed treatment sessions this month yet.
                  </Typography>
                ) : (
                  <Stack spacing={1.25} divider={<Divider flexItem />}>
                    {(monthlySummary.rankings?.top_treatments ?? []).map(
                      (row, index) => (
                        <Stack
                          key={`${row.template_id ?? row.name}-${index}`}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          spacing={2}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700 }}
                            >
                              {index + 1}. {row.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {row.usage_count} sessions
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                          >
                            {formatKyats(row.total_revenue ?? 0)}
                          </Typography>
                        </Stack>
                      ),
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>

            <Card
              elevation={0}
              sx={{ borderRadius: 3, ...glassPanelSx(theme) }}
            >
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  Top commission earners
                </Typography>
                {(monthlySummary.rankings?.top_commission_earners ?? [])
                  .length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No commission entries recorded this month yet.
                  </Typography>
                ) : (
                  <Stack spacing={1.25} divider={<Divider flexItem />}>
                    {(
                      monthlySummary.rankings?.top_commission_earners ?? []
                    ).map((row, index) => (
                      <Stack
                        key={row.staff_id}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={2}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {index + 1}. {row.staff_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.entry_count} entries
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                          {formatKyats(row.total_commission ?? 0)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      ) : null}

      {/* Follow-up + operations rail */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
          },
          gap: 2.5,
          alignItems: "stretch",
        }}
      >
        <Card
          elevation={0}
          sx={{ borderRadius: 3, overflow: "hidden", ...glassPanelSx(theme) }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <SectionLabel
              icon={AssignmentTurnedInOutlinedIcon}
              title="Follow-up center"
              hint="Open tasks, due pressure, and the next conversations to run"
            />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 2.5 }}
            >
              {[
                { label: "Overdue", value: followUp.overdue },
                { label: "Due today", value: followUp.dueToday },
                { label: "Later this week", value: followUp.dueThisWeek },
                { label: "Open total", value: followUp.openCount },
              ].map((cell) => (
                <Box
                  key={cell.label}
                  sx={{
                    flex: 1,
                    borderRadius: 2,
                    px: 2,
                    py: 1.75,
                    border: 1,
                    borderColor: "divider",
                    ...glassInsetSx(theme),
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    {cell.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {cell.value}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Next in queue
              </Typography>
              <Button
                size="small"
                endIcon={<OpenInNewIcon />}
                onClick={() => onOpen("follow-up-center")}
              >
                Open center
              </Button>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {followUp.preview.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No open follow-up tasks — great moment to plan outreach.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {followUp.preview.map((task) => {
                  const due = dayjs(task.dueDate);
                  const dueLabel = due.isValid() ? due.format("D MMM") : "—";
                  const overdue =
                    due.isValid() &&
                    due.isBefore(dayjs().startOf("day"), "day");
                  return (
                    <Box
                      key={task.id}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
                        gap: 1,
                        alignItems: "center",
                        p: 1.5,
                        borderRadius: 2,
                        border: 1,
                        borderColor: "divider",
                        bgcolor: (t) =>
                          alpha(
                            t.palette.background.default,
                            t.palette.mode === "dark" ? 0.45 : 0.4,
                          ),
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700 }} noWrap>
                          {task.patientName}
                        </Typography>
                        {task.headline ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            {task.headline}
                          </Typography>
                        ) : null}
                      </Box>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        flexWrap="wrap"
                        justifyContent={{ xs: "flex-start", sm: "flex-end" }}
                      >
                        <Chip
                          size="small"
                          label={FOLLOW_TYPE_LABEL[task.type] ?? task.type}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={dueLabel}
                          color={overdue ? "error" : "default"}
                          variant={overdue ? "filled" : "outlined"}
                        />
                        <Chip
                          size="small"
                          label={
                            FOLLOW_STATUS_LABEL[task.status] ?? task.status
                          }
                          color={
                            task.status === "in_progress"
                              ? "primary"
                              : "default"
                          }
                          variant="outlined"
                        />
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Stack spacing={2.5}>
          <Card elevation={0} sx={{ borderRadius: 3, ...glassPanelSx(theme) }}>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  {pendingActionsLabel}
                </Typography>
                <WarningAmberIcon color="warning" fontSize="small" />
              </Stack>
              {pendingActions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nothing queued — systems look calm.
                </Typography>
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
                      }}
                    >
                      <Typography variant="body2" sx={{ minWidth: 0 }} noWrap>
                        {item.label}
                      </Typography>
                      <Button
                        size="small"
                        endIcon={<OpenInNewIcon fontSize="inherit" />}
                        onClick={() => onOpen(item.path)}
                      >
                        {item.value}
                      </Button>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 3, ...glassPanelSx(theme) }}>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1.5 }}
              >
                <Inventory2OutlinedIcon color="warning" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Inventory signals
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Stock pressure from your latest alerts scan.
              </Typography>
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">Low stock SKUs</Typography>
                  <Chip
                    label={inventory.lowStock}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">Out of stock</Typography>
                  <Chip
                    label={inventory.outOfStock}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNewIcon />}
                  onClick={() => onOpen("inventory")}
                >
                  Review inventory
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      {/* Team load */}
      <Card elevation={0} sx={{ borderRadius: 3, ...glassPanelSx(theme) }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
            {workloadLabel}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 2 }}
          >
            Active visits by assigned clinician — snapshot now.
          </Typography>
          {staffWorkload.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No in-flight visits with assignees detected.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {staffWorkload.map((item) => (
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
                        sx={{ fontWeight: 500, opacity: 0.78 }}
                      >
                        ({item.role})
                      </Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.count} active
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, item.count * 15)}
                    sx={{ height: 8, borderRadius: 99 }}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
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
