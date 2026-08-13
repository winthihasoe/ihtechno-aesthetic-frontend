import { Button, TextField } from "@mui/material";

export default function PatientNotesTab({
  notes,
  setNotes,
  canUpdatePatientNotes,
  savingNotes,
  handleSaveNotes,
}) {
  return (
    <>
      <TextField
        fullWidth
        multiline
        minRows={4}
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        sx={{ maxWidth: 600 }}
        disabled={!canUpdatePatientNotes}
      />
      {canUpdatePatientNotes && (
        <Button
          variant="contained"
          sx={{ mt: 1.5 }}
          disabled={savingNotes}
          onClick={handleSaveNotes}
        >
          Save Notes
        </Button>
      )}
    </>
  );
}
