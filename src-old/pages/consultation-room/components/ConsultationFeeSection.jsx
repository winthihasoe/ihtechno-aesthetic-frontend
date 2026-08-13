import {
  Box,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import LabeledTextField from "../../../components/common/LabeledTextField";
import { formatFeeInput } from "../../../utils/formatFeeInput";
import { computeConsultationFeeTotal } from "../../../utils/consultationFeeUtils";
import ConsultationSectionCard from "./ConsultationSectionCard";

const feeFieldGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
  gap: 1.25,
};

export default function ConsultationFeeSection({ form, onField }) {
  const applyFee = Boolean(form.session_fee_enabled);
  const invoiceTotal = computeConsultationFeeTotal(form);

  const handleFeeChange = (e) => {
    onField("session_fee_amount")({
      target: { value: formatFeeInput(e.target.value) },
    });
  };

  return (
    <ConsultationSectionCard
      title="Consultation Fee"
      subtitle="Turn off to waive the fee (FOC). The invoice will show 100% discount."
      sx={{ mt: 2 }}
    >
      <Stack spacing={1.5}>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={applyFee}
                onChange={onField("session_fee_enabled")}
              />
            }
            label="Apply consulting fee"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {applyFee
              ? "Fee is billable. Use Discount % below if the patient gets a partial reduction."
              : "Fee is waived (FOC). Amount fields are kept for reference but not charged on the invoice."}
          </Typography>
        </Box>

        <Box sx={feeFieldGridSx}>
          <LabeledTextField
            title="Consulting Fee Amount"
            size="small"
            type="number"
            inputProps={{ min: 0, step: 1 }}
            value={formatFeeInput(form.session_fee_amount)}
            onChange={handleFeeChange}
            disabled={!applyFee}
            fullWidth
          />
          <LabeledTextField
            title="Discount %"
            size="small"
            type="number"
            inputProps={{ min: 0, max: 100, step: 1 }}
            value={form.session_discount_percent}
            onChange={onField("session_discount_percent")}
            disabled={!applyFee}
            fullWidth
          />
        </Box>

        <Typography variant="body2" color="text.secondary">
          Invoice total for consultation:{" "}
          <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
            {applyFee ? `${invoiceTotal.toLocaleString("en-US")} K` : "FOC (0 K)"}
          </Typography>
        </Typography>
      </Stack>
    </ConsultationSectionCard>
  );
}
