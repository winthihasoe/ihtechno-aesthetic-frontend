import { useEffect, useMemo, useState } from "react";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Popover,
  Stack,
  TableCell,
  TextField,
  Typography,
} from "@mui/material";

function toSelectionArray(selectedValues) {
  if (selectedValues instanceof Set) {
    return Array.from(selectedValues);
  }
  return Array.isArray(selectedValues) ? selectedValues : [];
}

export default function TableColumnFilterHeader({
  label,
  align = "left",
  options = [],
  selectedValues,
  onApply,
  onClear,
  cellSx,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [search, setSearch] = useState("");
  const [draftSelected, setDraftSelected] = useState(() => new Set());
  const [draftDirty, setDraftDirty] = useState(false);

  const appliedSelected = useMemo(
    () => new Set(toSelectionArray(selectedValues)),
    [selectedValues],
  );

  const isActive =
    options.length > 0 && appliedSelected.size !== options.length;

  const open = Boolean(anchorEl);

  const visibleOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, search]);

  const allVisibleSelected =
    visibleOptions.length > 0 &&
    visibleOptions.every((option) => draftSelected.has(option));

  const someVisibleSelected =
    visibleOptions.some((option) => draftSelected.has(option)) &&
    !allVisibleSelected;

  useEffect(() => {
    if (!open) return;
    setDraftSelected(new Set(appliedSelected));
    setSearch("");
    setDraftDirty(false);
  }, [open, appliedSelected]);

  const handleOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const toggleOption = (option) => {
    setDraftDirty(true);
    setDraftSelected((prev) => {
      const next = new Set(prev);
      if (next.has(option)) {
        next.delete(option);
      } else {
        next.add(option);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    setDraftDirty(true);
    setDraftSelected((prev) => {
      const next = new Set(prev);
      const query = search.trim();
      if (allVisibleSelected) {
        for (const option of visibleOptions) {
          next.delete(option);
        }
        return next;
      }
      if (query) {
        return new Set(visibleOptions);
      }
      for (const option of visibleOptions) {
        next.add(option);
      }
      return next;
    });
  };

  const handleApply = () => {
    const query = search.trim();
    let applied = Array.from(draftSelected);

    if (query) {
      const visibleSet = new Set(visibleOptions);
      const visibleSelected = visibleOptions.filter((option) =>
        draftSelected.has(option),
      );
      const hiddenSelected = applied.filter((option) => !visibleSet.has(option));
      const startedFromAllSelected = appliedSelected.size === options.length;

      if (draftDirty || !startedFromAllSelected) {
        applied = [...hiddenSelected, ...visibleSelected];
      } else {
        applied = visibleSelected;
      }
    }

    onApply(applied);
    handleClose();
  };

  const handleClear = () => {
    onClear();
    handleClose();
  };

  return (
    <TableCell align={align} sx={cellSx}>
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.25,
          maxWidth: "100%",
        }}
      >
        <Typography
          component="span"
          variant="inherit"
          sx={{ fontWeight: 600, lineHeight: 1.2 }}
        >
          {label}
        </Typography>
        <IconButton
          size="small"
          aria-label={`Filter ${label}`}
          onClick={handleOpen}
          sx={{
            p: 0.25,
            color: isActive ? "primary.main" : "text.secondary",
            bgcolor: isActive ? "action.selected" : "transparent",
            "&:hover": {
              bgcolor: isActive ? "action.selected" : "action.hover",
            },
          }}
        >
          <ArrowDropDownIcon fontSize="small" />
        </IconButton>
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: { width: 260, p: 1.5 },
            onClick: (event) => event.stopPropagation(),
          },
        }}
      >
        <Stack spacing={1}>
          <TextField
            size="small"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
          />

          <FormControlLabel
            sx={{ mx: 0, alignItems: "flex-start" }}
            control={
              <Checkbox
                size="small"
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected}
                onChange={toggleAllVisible}
                disabled={visibleOptions.length === 0}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Select all
              </Typography>
            }
          />

          <Box
            sx={{
              maxHeight: 220,
              overflowY: "auto",
              borderTop: 1,
              borderBottom: 1,
              borderColor: "divider",
              py: 0.5,
            }}
          >
            {visibleOptions.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 0.5, py: 1 }}
              >
                No values
              </Typography>
            ) : (
              visibleOptions.map((option) => (
                <FormControlLabel
                  key={option}
                  sx={{ mx: 0, display: "flex", alignItems: "flex-start" }}
                  control={
                    <Checkbox
                      size="small"
                      checked={draftSelected.has(option)}
                      onChange={() => toggleOption(option)}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{
                        wordBreak: "break-word",
                        color:
                          option === "(Blank)" ? "text.secondary" : "text.primary",
                      }}
                    >
                      {option}
                    </Typography>
                  }
                />
              ))
            )}
          </Box>

          <Stack direction="row" spacing={0.75} justifyContent="flex-end">
            <Button size="small" onClick={handleClear}>
              Clear
            </Button>
            <Button size="small" variant="contained" onClick={handleApply}>
              OK
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </TableCell>
  );
}
