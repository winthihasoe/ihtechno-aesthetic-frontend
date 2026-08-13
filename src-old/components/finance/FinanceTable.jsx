import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import LoadingIndicator from "../common/LoadingIndicator";
import { useFinanceTokens } from "./financeTokens";
import FinancePanel, { FinancePanelTable } from "./FinancePanel";

export default function FinanceTable({
  columns,
  children,
  loading = false,
  emptyMessage = "No records found.",
  colSpan,
  stickyHeader = false,
  size = "small",
  sx,
  paperSx,
  wrapTable = true,
  /** When true, table sits flat inside a parent FinancePanel (no extra surface). */
  embedded = false,
}) {
  const { financeSurfaceSx, financeTableContainerSx, compactTableSx } =
    useFinanceTokens();
  const span = colSpan ?? columns?.length ?? 1;

  const table = (
    <Table
      size={size}
      stickyHeader={stickyHeader}
      sx={{ ...compactTableSx, ...sx }}
    >
      {columns?.length ? (
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.id ?? col.label} align={col.align}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
      ) : null}
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={span} align="center" sx={{ py: 3 }}>
              <LoadingIndicator size={40} />
            </TableCell>
          </TableRow>
        ) : null}
        {!loading && !children ? (
          <TableRow>
            <TableCell colSpan={span} align="center" sx={{ py: 2 }}>
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : null}
        {!loading ? children : null}
      </TableBody>
    </Table>
  );

  if (!wrapTable) {
    return (
      <TableContainer sx={{ ...financeTableContainerSx, ...paperSx }}>
        {table}
      </TableContainer>
    );
  }

  if (embedded) {
    return <FinancePanelTable sx={paperSx}>{table}</FinancePanelTable>;
  }

  return (
    <FinancePanel sx={paperSx}>
      <FinancePanelTable>{table}</FinancePanelTable>
    </FinancePanel>
  );
}
