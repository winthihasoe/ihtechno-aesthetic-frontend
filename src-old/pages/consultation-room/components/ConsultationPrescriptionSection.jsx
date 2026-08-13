import { useState } from "react";
import { Button, Stack } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import PrescriptionForm from "../../../components/prescription/PrescriptionForm";
import PrescriptionPrintDialog from "../../../components/prescription/PrescriptionPrintDialog";
import ConsultationSectionCard from "./ConsultationSectionCard";

export default function ConsultationPrescriptionSection({
  items,
  notes,
  productOptions,
  prescriptionId = null,
  onItemsChange,
  onNotesChange,
}) {
  const [printOpen, setPrintOpen] = useState(false);

  return (
    <ConsultationSectionCard
      title="Prescribe Medicine"
      subtitle="Add medicines for this consultation. Billable items will appear on the invoice."
      sx={{ mt: 2 }}
    >
      <Stack spacing={1.5}>
        {prescriptionId ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            onClick={() => setPrintOpen(true)}
            sx={{ alignSelf: "flex-start" }}
          >
            Print prescription
          </Button>
        ) : null}
        <PrescriptionForm
          items={items}
          notes={notes}
          productOptions={productOptions}
          onItemsChange={onItemsChange}
          onNotesChange={onNotesChange}
          persistedPrescriptionId={prescriptionId}
        />
      </Stack>
      <PrescriptionPrintDialog
        open={printOpen}
        prescriptionId={prescriptionId}
        onClose={() => setPrintOpen(false)}
      />
    </ConsultationSectionCard>
  );
}
