import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import HrPageShell from "./components/HrPageShell";
import {
  createStaffGrievance,
  getMyStaffGrievances,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";

const initialForm = {
  recipient_type: "hr",
  is_anonymous: false,
  category: "other",
  severity: "medium",
  message: "",
};

export default function MyGrievancePage() {
  const { pushToast } = useToastStore();
  const [form, setForm] = useState(initialForm);
  const [rows, setRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [anonymousToken, setAnonymousToken] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    const res = await getMyStaffGrievances();
    setRows(res.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const selected = useMemo(
    () => rows.find((row) => Number(row.id) === Number(selectedId)) || null,
    [rows, selectedId],
  );

  const submitGrievance = async () => {
    if (!form.message.trim()) return;
    setSubmitting(true);
    try {
      const res = await createStaffGrievance(form);
      setAnonymousToken(res.anonymous_followup_token || "");
      setForm(initialForm);
      setSubmitOpen(false);
      pushToast({ message: "Grievance submitted.", severity: "success" });
      await load();
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to submit grievance."), severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HrPageShell title="HR Module" subtitle="Grievance Channel">
      <Card variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              My submitted grievances
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Click any row to view grievance details.
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => setSubmitOpen(true)}>
            + Submit Grievance
          </Button>
        </Stack>
        {anonymousToken ? (
          <Alert severity="success" sx={{ mb: 1.5 }}>
            Anonymous token (save this): {anonymousToken}
          </Alert>
        ) : null}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Recipient</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                hover
                selected={Number(selectedId) === Number(row.id)}
                onClick={() => setSelectedId(row.id)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell>{row.id}</TableCell>
                <TableCell><Chip size="small" label={row.status} /></TableCell>
                <TableCell>{row.recipient_type}</TableCell>
                <TableCell>{row.severity}</TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={row.is_anonymous ? { filter: "blur(4px)", userSelect: "none" } : undefined}
                  >
                    {row.message}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No grievance records yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            bgcolor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
            pr: 7,
          }}
        >
          Grievance details
          <IconButton
            aria-label="close"
            onClick={() => setSelectedId(null)}
            sx={{ position: "absolute", right: 12, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {!selected ? null : (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={selected.status} />
                <Chip size="small" variant="outlined" label={`to ${selected.recipient_type}`} />
                <Chip size="small" variant="outlined" label={selected.severity} />
                {selected.is_anonymous ? <Chip size="small" color="warning" label="Anonymous" /> : null}
              </Stack>
              <Typography variant="body2">{selected.message}</Typography>
              <Typography variant="caption" color="text.secondary">
                {selected.messages?.length || 0} message(s) in thread
              </Typography>
              <Stack spacing={0.75}>
                {(selected.messages || [])
                  .filter((message) => !message.is_internal)
                  .map((message) => (
                    <Card key={message.id} variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {message.sender_is_staff
                          ? "You"
                          : message.sender?.name || "Management"}
                      </Typography>
                      <Typography variant="body2">{message.message}</Typography>
                    </Card>
                  ))}
                {selected.messages?.filter((message) => !message.is_internal).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No visible messages in this thread yet.
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={submitOpen} onClose={() => setSubmitOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Submit Grievance</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <TextField
              select
              size="small"
              label="Send to"
              value={form.recipient_type}
              onChange={(e) => setForm((prev) => ({ ...prev, recipient_type: e.target.value }))}
            >
              <MenuItem value="hr">HR</MenuItem>
              <MenuItem value="owner">Owner only</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Category"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            >
              <MenuItem value="harassment">Harassment</MenuItem>
              <MenuItem value="payroll">Payroll</MenuItem>
              <MenuItem value="safety">Safety</MenuItem>
              <MenuItem value="manager_behavior">Manager behavior</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            <FormControl>
              <FormLabel>Severity</FormLabel>
              <RadioGroup
                row
                value={form.severity}
                onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value }))}
              >
                <FormControlLabel value="low" control={<Radio size="small" />} label="Low" />
                <FormControlLabel value="medium" control={<Radio size="small" />} label="Medium" />
                <FormControlLabel value="high" control={<Radio size="small" />} label="High" />
              </RadioGroup>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.is_anonymous}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_anonymous: e.target.checked }))}
                />
              }
              label="Reveiw Anonymous"
            />
            <TextField
              multiline
              minRows={4}
              size="small"
              label="Message"
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={submitting} onClick={submitGrievance}>
            Submit grievance
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}
