import { TableCell } from "@mui/material";
import { formatKyats } from "../../utils/formatKyats";
import { financeAmountSx, financeCreditColor } from "./financeTokens";

export default function FinanceCreditCell({
  value,
  align = "right",
  component = TableCell,
  emptyDash = true,
  sx,
  ...rest
}) {
  const Cell = component;
  const num = Number(value) || 0;
  const show = num > 0;

  return (
    <Cell
      align={align}
      className={show ? "finance-credit-cell" : "finance-credit-cell is-zero"}
      sx={{
        ...financeAmountSx,
        color: show ? financeCreditColor : "text.secondary",
        fontWeight: show ? 600 : 400,
        ...sx,
      }}
      {...rest}
    >
      {show ? formatKyats(num) : emptyDash ? "—" : formatKyats(0)}
    </Cell>
  );
}
