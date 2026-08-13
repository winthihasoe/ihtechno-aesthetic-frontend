import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Typography,
  Stack,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Box,
} from "@mui/material";
import {
  getTreatmentCategories,
  createTreatmentCategory,
} from "../../services/treatmentTemplateService";
import { resolveApiError } from "../../services/apiClient";

export default function NewTreatmentCategoryDialog({
  open,
  onClose,
  onSuccess,
}) {
  const [categories, setCategories] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCategories = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await getTreatmentCategories();
      const list = Array.isArray(data) ? data : [];
      setCategories(list);
      return list;
    } catch {
      setCategories([]);
      return [];
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setName("");
    setError("");
    loadCategories();
  }, [open, loadCategories]);

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");
    try {
      const created = await createTreatmentCategory({ name: trimmed });
      await loadCategories();
      onSuccess?.(created);
      handleClose();
    } catch (err) {
      setError(resolveApiError(err, "Could not create category."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>New treatment category</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Existing categories
            </Typography>
            {loadingList ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : categories.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No categories yet. Add one below.
              </Typography>
            ) : (
              <List
                dense
                sx={{
                  maxHeight: 200,
                  overflow: "auto",
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  py: 0,
                }}
              >
                {categories.map((c) => (
                  <ListItem key={c.id} divider>
                    <ListItemText
                      primary={c.name}
                      secondary={
                        c.templates_count != null
                          ? `${c.templates_count} treatment${Number(c.templates_count) === 1 ? "" : "s"}`
                          : undefined
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          <TextField
            autoFocus
            label="New category name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim() && !saving) {
                e.preventDefault();
                handleSave();
              }
            }}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? "Creating…" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
