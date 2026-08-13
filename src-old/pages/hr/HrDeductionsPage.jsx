import { useEffect, useMemo, useState } from "react";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { Alert, Link as MuiLink, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import PayrollAdjustmentCategoryPage from "./components/PayrollAdjustmentCategoryPage";
import { getStaffSalaryHolds } from "../../services/hrService";

export default function HrDeductionsPage() {
  const [activeHolds, setActiveHolds] = useState([]);

  useEffect(() => {
    getStaffSalaryHolds({ status: "active" })
      .then((response) => {
        const rows = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];
        setActiveHolds(rows);
      })
      .catch(() => setActiveHolds([]));
  }, []);

  const missingApplyCount = useMemo(
    () =>
      activeHolds.filter((row) => row.applied_for_month === false).length,
    [activeHolds],
  );

  const activeHoldsBanner =
    activeHolds.length > 0 ? (
      <Alert severity={missingApplyCount > 0 ? "warning" : "info"}>
        <Typography variant="body2" component="div">
          <strong>{activeHolds.length}</strong> active salary hold
          {activeHolds.length === 1 ? "" : "s"} on the{" "}
          <MuiLink component={RouterLink} to="/hr/salary-holds" underline="hover">
            Salary holds
          </MuiLink>{" "}
          register.
          {missingApplyCount > 0
            ? ` ${missingApplyCount} still need Apply to month before you regenerate payroll.`
            : " All are applied for the current payroll month."}
        </Typography>
      </Alert>
    ) : null;

  return (
    <PayrollAdjustmentCategoryPage
      category="deduction"
      title="Deductions"
      subtitle="Manual fines and payroll deductions with payroll-lock protection."
      addLabel="Add Deduction"
      topBanner={activeHoldsBanner}
      emptyState={{
        icon: RemoveCircleOutlineIcon,
        titleMonth: "No manual deductions this month",
        titleAll: "No manual deductions in this date range",
        description:
          "Record fines and other manual payroll deductions for staff. Automatic deductions from attendance, unpaid leave, and lateness are calculated during payroll generation and are not listed here.",
        bullets: [
          {
            label: "Add deductions:",
            text: "Select staff, type (fine, deduction, salary hold, or custom), amount, and effective date.",
          },
          {
            label: "Salary holds:",
            text: "Use the Salary holds register to remember who is on hold; Apply to month creates a linked deduction here.",
          },
          {
            label: "Not on this page:",
            text: "Absence penalties, unpaid leave, and late attendance deductions are applied automatically in payroll.",
          },
          {
            label: "Date range:",
            text: "Defaults to the current month. Expand the range to review or edit deductions from other periods.",
          },
          {
            label: "Payroll impact:",
            text: "Manual deduction totals reduce the staff payroll deductions bucket when payroll is generated.",
          },
          {
            label: "Payroll lock:",
            text: "Rows in finalized payroll months cannot be edited or deleted.",
          },
        ],
        footerMonth:
          "No manual deductions logged this month. Add a fine or deduction, or expand the date range to search history.",
        footerExpanded:
          "No matching deductions in the selected range. Adjust the dates, reset to this month, or add a new entry.",
      }}
    />
  );
}
