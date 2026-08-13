import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CarryoverChip from "./CarryoverChip";

const INLINE_LIMIT = 6;
const STORAGE_PREFIX = "liveboard_carryover_collapsed_";

export default function CarryoverStrip({
  visits = [],
  userId,
  onOpenVisit,
  onCancelVisit,
  canCancel = false,
}) {
  const storageKey = `${STORAGE_PREFIX}${userId ?? "anon"}`;
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed, storageKey]);

  const sorted = useMemo(
    () =>
      [...visits].sort(
        (a, b) =>
          new Date(a.visit_time || 0).getTime() -
          new Date(b.visit_time || 0).getTime(),
      ),
    [visits],
  );

  if (sorted.length === 0) {
    return null;
  }

  const inline = expanded ? sorted : sorted.slice(0, INLINE_LIMIT);
  const overflowCount = sorted.length - INLINE_LIMIT;

  return (
    <Box
      sx={{
        mb: 2,
        px: 1.5,
        py: 1,
        borderRadius: 2,
        border: 1,
        borderColor: "rgba(245, 158, 11, 0.5)",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(245, 158, 11, 0.08)"
            : "rgba(255, 251, 235, 0.4)",
      }}
      onClick={() => setCollapsed((v) => !v)}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: collapsed ? 0 : 0.5 }}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="warning.dark">
            Carryover from previous days ({sorted.length})
          </Typography>
          {!collapsed ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.25 }}
            >
              Open a card to pick up where you left off — finish clinical work,
              collect payment, or cancel the visit to allow a new check-in.
            </Typography>
          ) : null}
        </Box>
        <IconButton size="small" aria-label="Toggle carryover strip">
          {collapsed ? (
            <ExpandMoreIcon fontSize="small" />
          ) : (
            <ExpandLessIcon fontSize="small" />
          )}
        </IconButton>
      </Stack>

      <Collapse in={!collapsed}>
        <Stack
          direction="row"
          flexWrap={expanded ? "wrap" : "nowrap"}
          gap={1}
          sx={{
            overflowX: expanded ? "visible" : "auto",
            pb: 0.5,
          }}
        >
          {inline.map((visit) => (
            <CarryoverChip
              key={visit.id}
              visit={visit}
              onOpenVisit={onOpenVisit}
              onCancelVisit={onCancelVisit}
              canCancel={canCancel}
            />
          ))}
          {!expanded && overflowCount > 0 ? (
            <Button
              size="small"
              variant="text"
              onClick={() => setExpanded(true)}
            >
              +{overflowCount} older
            </Button>
          ) : null}
          {expanded && overflowCount > 0 ? (
            <Button
              size="small"
              variant="text"
              onClick={() => setExpanded(false)}
            >
              Show fewer
            </Button>
          ) : null}
        </Stack>
      </Collapse>
    </Box>
  );
}
