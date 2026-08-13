import dayjs from "dayjs";
import { Card, Chip, Stack, Typography } from "@mui/material";
import VisitReferenceHeader from "./VisitReferenceHeader";
import { formatKyats } from "../../../utils/formatKyats";

export default function PatientPaymentHistoryTab({ visits }) {
  const withPayment = (visits ?? [])
    .filter((visit) => visit.payment)
    .sort((a, b) => {
      const ta = dayjs(a.visit_time ?? a.created_at).valueOf();
      const tb = dayjs(b.visit_time ?? b.created_at).valueOf();
      return tb - ta;
    });

  if (!withPayment.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No bills or payment records linked to visits yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {withPayment.map((visit) => {
        const payment = visit.payment;
        const status = (payment.status || "unpaid").toLowerCase();
        const isPaid = status === "paid";

        return (
          <Card key={visit.id} variant="outlined" sx={{ p: 2 }}>
            <VisitReferenceHeader visit={visit} sx={{ mb: 1 }} />
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="body1" fontWeight={600}>
                {formatKyats(payment.amount || 0)}
              </Typography>
              <Chip
                size="small"
                label={isPaid ? "Paid" : "Unpaid"}
                color={isPaid ? "success" : "warning"}
                sx={{ textTransform: "capitalize" }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {payment.paid_at
                ? `Paid at ${dayjs(payment.paid_at).format("D MMM YYYY, HH:mm")}`
                : "Not paid yet"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Visit #{visit.id} · Bill #{payment.id}
            </Typography>
          </Card>
        );
      })}
    </Stack>
  );
}
