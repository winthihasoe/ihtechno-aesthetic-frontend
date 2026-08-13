import FilterListIcon from "@mui/icons-material/FilterList";
import { Box, Button, Chip, Collapse, Stack } from "@mui/material";

export function CollapsibleFiltersToggle({
  open,
  onToggle,
  activeCount = 0,
  label = "Filters",
  ...buttonProps
}) {
  return (
    <Button
      variant="outlined"
      startIcon={<FilterListIcon />}
      onClick={() => onToggle(!open)}
      aria-expanded={open}
      {...buttonProps}
    >
      {label}
      {activeCount > 0 ? (
        <Chip size="small" label={activeCount} color="primary" sx={{ ml: 1 }} />
      ) : null}
    </Button>
  );
}

export function CollapsibleFiltersPanel({
  open,
  onApply,
  onClear,
  applyLabel = "Apply",
  clearLabel = "Clear filters",
  children,
  showActions = true,
  sx,
  actionsSx,
}) {
  return (
    <Collapse in={open}>
      <Box
        sx={{
          mb: 2,
          p: 2,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "background.paper",
          ...sx,
        }}
      >
        <Stack spacing={2}>
          {children}
          {showActions && (onApply || onClear) ? (
            <Stack direction="row" spacing={1} sx={actionsSx}>
              {onApply ? (
                <Button variant="contained" onClick={onApply}>
                  {applyLabel}
                </Button>
              ) : null}
              {onClear ? (
                <Button variant="outlined" onClick={onClear}>
                  {clearLabel}
                </Button>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </Box>
    </Collapse>
  );
}
