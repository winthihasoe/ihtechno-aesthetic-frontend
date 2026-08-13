import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../../components/common/LoadingIndicator";
import PatientTabEmptyState from "./PatientTabEmptyState";
import useAuthStore from "../../../stores/authStore";
import useConfirmStore from "../../../stores/confirmStore";
import useToastStore from "../../../stores/toastStore";
import { resolveApiError } from "../../../services/apiClient";
import {
  createPatientNote,
  deletePatientNote,
  getPatientNotes,
  updatePatientNote,
} from "../../../services/patientService";

const formatNoteTimestamp = (iso) =>
  iso ? dayjs(iso).format("DD-MM-YYYY hh:mm") : "—";

const NOTE_INSTRUCTIONS = {
  title: "Internal notes",
  description:
    "Add concise clinical or operational notes for follow-up visits. Notes are visible to staff with patient access.",
  steps: [
    "Record key observation, caution, or follow-up action.",
    "Newest notes appear at the top of the timeline.",
    "Only you can edit or delete notes you created.",
    "Deleted notes stay on the timeline for audit.",
  ],
};

function NotesInstructionsPanel({ sticky = true }) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        bgcolor: "background.paper",
        ...(sticky && {
          position: { md: "sticky" },
          top: { md: 16 },
        }),
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.25,
            bgcolor: "primary.light",
            color: "primary.dark",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {NOTE_INSTRUCTIONS.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {NOTE_INSTRUCTIONS.description}
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 1.25 }}>
            {NOTE_INSTRUCTIONS.steps.map((step, index) => (
              <Typography key={step} variant="caption" color="text.secondary">
                {index + 1}. {step}
              </Typography>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function NoteTimelineItem({ note, isLast, canManageNote, onEdit, onDelete }) {
  const isDeleted = Boolean(note.deleted_at);
  const authorName =
    note.created_by?.name ??
    (note.created_by === null ? "System migration" : "Unknown");
  const edited =
    note.updated_at &&
    note.created_at &&
    dayjs(note.updated_at).isAfter(dayjs(note.created_at));

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "28px 1fr",
        columnGap: 1.5,
        pb: isLast ? 0 : 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: 0.35,
        }}
      >
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "2px solid",
            borderColor: isDeleted ? "text.disabled" : "primary.main",
            bgcolor: isDeleted ? "action.hover" : "primary.light",
            flexShrink: 0,
            zIndex: 1,
          }}
        />
        {!isLast && (
          <Box
            sx={{
              width: 2,
              flex: 1,
              minHeight: 24,
              mt: 0.5,
              bgcolor: "divider",
              borderRadius: 1,
            }}
          />
        )}
      </Box>

      <Box
        sx={{
          border: "1px solid",
          borderColor: isDeleted ? "divider" : "divider",
          borderRadius: 1.5,
          p: 1.5,
          bgcolor: isDeleted ? "action.hover" : "background.paper",
          opacity: isDeleted ? 0.78 : 1,
          minWidth: 0,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, letterSpacing: 0.2 }}
            >
              {formatNoteTimestamp(note.created_at)}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 0.75,
                whiteSpace: "pre-wrap",
                fontStyle: isDeleted ? "italic" : "normal",
                color: isDeleted ? "text.secondary" : "text.primary",
              }}
            >
              {note.body}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.75, display: "block" }}
            >
              {authorName}
              {edited && !isDeleted
                ? ` · edited ${formatNoteTimestamp(note.updated_at)}`
                : ""}
            </Typography>
            {isDeleted && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.35 }}
              >
                Deleted by {note.deleted_by?.name ?? "Unknown"} at{" "}
                {formatNoteTimestamp(note.deleted_at)}
              </Typography>
            )}
          </Box>
          {canManageNote && !isDeleted && (
            <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
              <IconButton
                size="small"
                aria-label="Edit note"
                onClick={() => onEdit(note)}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="Delete note"
                onClick={() => onDelete(note)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

function NoteTimelineEditRow({
  isLast,
  saving,
  editBody,
  setEditBody,
  onSave,
  onCancel,
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "28px 1fr",
        columnGap: 1.5,
        pb: isLast ? 0 : 2,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "2px solid",
            borderColor: "primary.main",
            bgcolor: "primary.main",
            flexShrink: 0,
          }}
        />
      </Box>
      <Box
        sx={{
          border: "1px solid",
          borderColor: "primary.main",
          borderRadius: 1.5,
          p: 1.5,
          bgcolor: "background.paper",
        }}
      >
        <TextField
          fullWidth
          multiline
          minRows={3}
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          disabled={saving}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            variant="contained"
            size="small"
            disabled={saving || !editBody.trim()}
            onClick={onSave}
          >
            Save
          </Button>
          <Button size="small" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

function NotesTimelineList({
  notes,
  activeNotes,
  editingNoteId,
  editBody,
  setEditBody,
  saving,
  canManageNote,
  startEdit,
  handleDelete,
  handleSaveEdit,
  clearEdit,
}) {
  return (
    <Box>
      {activeNotes.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          All notes have been deleted. Deleted entries remain on the timeline
          for audit.
        </Typography>
      )}
      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {notes.map((note, index) => {
          const isLast = index === notes.length - 1;

          if (editingNoteId === note.id && canManageNote(note)) {
            return (
              <Box component="li" key={note.id}>
                <NoteTimelineEditRow
                  isLast={isLast}
                  saving={saving}
                  editBody={editBody}
                  setEditBody={setEditBody}
                  onSave={handleSaveEdit}
                  onCancel={clearEdit}
                />
              </Box>
            );
          }

          return (
            <Box component="li" key={note.id}>
              <NoteTimelineItem
                note={note}
                isLast={isLast}
                canManageNote={canManageNote(note)}
                onEdit={startEdit}
                onDelete={handleDelete}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default function PatientNotesTab({ patientId, canUpdatePatientNotes }) {
  const { user } = useAuthStore();
  const { askConfirm } = useConfirmStore();
  const { pushToast } = useToastStore();
  const currentUserId = user?.id ?? null;

  const canManageNote = (note) =>
    canUpdatePatientNotes &&
    currentUserId != null &&
    note.created_by?.id != null &&
    Number(note.created_by.id) === Number(currentUserId);

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editBody, setEditBody] = useState("");

  const loadNotes = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getPatientNotes(patientId);
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(resolveApiError(err, "Could not load patient notes."));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const activeNotes = notes.filter((note) => !note.deleted_at);

  const handleAddNote = async () => {
    const body = composerBody.trim();
    if (!body || !canUpdatePatientNotes) return;

    setSaving(true);
    try {
      const created = await createPatientNote(patientId, { body });
      setNotes((prev) => [created, ...prev]);
      setComposerBody("");
      pushToast({ message: "Note added.", severity: "success" });
    } catch (err) {
      setError(resolveApiError(err, "Unable to add note."));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    const body = editBody.trim();
    if (!editingNoteId || !body) return;

    setSaving(true);
    try {
      const updated = await updatePatientNote(patientId, editingNoteId, {
        body,
      });
      setNotes((prev) =>
        prev.map((note) => (note.id === updated.id ? updated : note)),
      );
      setEditingNoteId(null);
      setEditBody("");
      pushToast({ message: "Note updated.", severity: "success" });
    } catch (err) {
      setError(resolveApiError(err, "Unable to update note."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note) => {
    const confirmed = await askConfirm({
      title: "Delete note?",
      message: "This note will remain visible as deleted for audit purposes.",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      const deleted = await deletePatientNote(patientId, note.id);
      setNotes((prev) =>
        prev.map((item) => (item.id === deleted.id ? deleted : item)),
      );
      pushToast({ message: "Note deleted.", severity: "success" });
    } catch (err) {
      setError(resolveApiError(err, "Unable to delete note."));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note) => {
    if (!canManageNote(note)) return;
    setEditingNoteId(note.id);
    setEditBody(note.body);
  };

  const clearEdit = () => {
    setEditingNoteId(null);
    setEditBody("");
  };

  const timelineProps = {
    notes,
    activeNotes,
    editingNoteId,
    editBody,
    setEditBody,
    saving,
    canManageNote,
    startEdit,
    handleDelete,
    handleSaveEdit,
    clearEdit,
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8, lg: 7 }}>
          <Stack spacing={1.5}>
            {canUpdatePatientNotes && (
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 1.5,
                  bgcolor: "background.paper",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Add note
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  value={composerBody}
                  onChange={(e) => setComposerBody(e.target.value)}
                  placeholder="Record observation, caution, or follow-up notes."
                  disabled={saving}
                />
                <Button
                  variant="contained"
                  sx={{ mt: 1.25 }}
                  disabled={saving || !composerBody.trim()}
                  onClick={handleAddNote}
                >
                  {saving ? "Saving…" : "Save note"}
                </Button>
              </Box>
            )}

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <LoadingIndicator size={24} />
              </Box>
            ) : (
              <NotesTimelineList {...timelineProps} />
            )}
          </Stack>
        </Grid>

        <Grid
          size={{ xs: 12, md: 4, lg: 5 }}
          sx={{ display: { xs: "none", md: "block" } }}
        >
          <NotesInstructionsPanel />
        </Grid>
      </Grid>
    </Box>
  );
}
