import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PayrollAdjustmentCategoryPage from "./components/PayrollAdjustmentCategoryPage";

export default function HrVariablePayPage() {
  return (
    <PayrollAdjustmentCategoryPage
      category="variable_pay"
      title="Variable Pay"
      subtitle="One-time performance pay, refunds, bonuses, and manual commissions."
      addLabel="Add Variable Pay"
      includeAutoCommissions
      emptyState={{
        icon: TrendingUpIcon,
        titleMonth: "No variable pay this month",
        titleAll: "No variable pay in this date range",
        description:
          "Track one-time pay beyond base salary — performance bonuses, refunds, yearly bonuses, and commissions. Manual lines roll into payroll adjustments; auto commissions from treatments appear read-only.",
        bullets: [
          {
            label: "Add manual entries:",
            text: "Choose staff, compensation type, amount, and effective date. Use Add new type in the picker for custom categories.",
          },
          {
            label: "Auto commission:",
            text: "Treatment and package commissions appear here with an Auto tag. They are read-only and come from the commission ledger.",
          },
          {
            label: "Date range:",
            text: "The list defaults to the current calendar month. Widen From/To or use Expand date range to search older periods.",
          },
          {
            label: "Payroll impact:",
            text: "Non-commission variable pay adds to adjustments_amount; commission adds to commission_amount when payroll is generated.",
          },
          {
            label: "Payroll lock:",
            text: "Rows in finalized payroll months cannot be edited or deleted.",
          },
        ],
        footerMonth:
          "Nothing logged this month yet. Add a line, or expand the date range if the payment falls in another period.",
        footerExpanded:
          "No matching variable pay in the selected range. Adjust the dates, reset to this month, or add a new entry.",
      }}
    />
  );
}
