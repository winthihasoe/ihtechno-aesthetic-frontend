import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  formatCommaAmountFromNumber,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import { formatReceiptMoney } from "../../utils/invoiceReceiptUtils";
import {
  DISCOUNT_TYPE_OPTIONS,
  LINE_TYPE_OPTIONS,
} from "../../utils/paymentDetailConstants";
import { canEditLineDiscount } from "../../utils/paymentDetailUtils";
import { InvoiceLineLabelEditor } from "./InvoiceLineLabelEditor";

const formatMoney = formatReceiptMoney;

function displayUnitPrice(value) {
  if (value === "" || value == null) return "";
  if (typeof value === "string") return value;
  return formatCommaAmountFromNumber(value);
}

export function PaymentInvoiceLinesEditor({
  lines,
  canEditDraft,
  productOptions,
  packagePickerOptions,
  treatmentPickerOptions,
  autocompleteSlotProps,
  setLineValue,
  handleLineTypeChange,
  handleLabelBlur,
  handlePriceBlur,
  handleRemoveLine,
}) {
  return (
    <>
      <Box
        className="no-print"
        sx={{ display: { xs: "block", sm: "none" } }}
      >
        <Stack spacing={1.25}>
          {lines.map((line, index) => (
            <Paper
              key={`mobile-line-${index}`}
              variant="outlined"
              sx={{ p: 1.25, borderRadius: 2 }}
            >
              <Stack spacing={1.25}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Typography variant="subtitle2" fontWeight={700}>
                    Item {index + 1}
                  </Typography>
                  {canEditDraft && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveLine(index)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                {canEditDraft ? (
                  <FormControl size="small" fullWidth>
                    <InputLabel id={`mobile-type-label-${index}`}>
                      Type
                    </InputLabel>
                    <Select
                      labelId={`mobile-type-label-${index}`}
                      value={line.type || "other"}
                      label="Type"
                      onChange={(e) =>
                        handleLineTypeChange(index, e.target.value)
                      }
                    >
                      {LINE_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Typography variant="body2">
                    {line.type || "other"}
                  </Typography>
                )}

                <InvoiceLineLabelEditor
                  line={line}
                  index={index}
                  canEditDraft={canEditDraft}
                  productOptions={productOptions}
                  packagePickerOptions={packagePickerOptions}
                  treatmentPickerOptions={treatmentPickerOptions}
                  autocompleteSlotProps={autocompleteSlotProps}
                  setLineValue={setLineValue}
                  handleLabelBlur={handleLabelBlur}
                />

                <Stack direction="row" spacing={1}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {canEditDraft && line.type !== "package_discount" ? (
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Qty"
                        value={line.qty ?? ""}
                        onChange={(e) =>
                          setLineValue(index, { qty: e.target.value })
                        }
                        onBlur={() => {
                          const qty = Number(line.qty || 0);
                          if (qty <= 0) setLineValue(index, { qty: 1 });
                        }}
                        inputProps={{ min: 0, step: 1 }}
                      />
                    ) : (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Qty
                        </Typography>
                        <Typography variant="body2">{line.qty}</Typography>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ flex: 1.4, minWidth: 0 }}>
                    {canEditDraft && line.type !== "package_discount" ? (
                      <TextField
                        fullWidth
                        size="small"
                        label="Price"
                        value={displayUnitPrice(line.unit_price)}
                        onChange={(e) =>
                          setLineValue(index, {
                            unit_price: sanitizeCommaAmountInput(
                              e.target.value,
                            ),
                          })
                        }
                        onBlur={() => handlePriceBlur(index)}
                        inputProps={{ inputMode: "decimal" }}
                        placeholder="e.g. 100,000"
                      />
                    ) : (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Price
                        </Typography>
                        <Typography variant="body2">
                          {formatMoney(line.unit_price)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Box sx={{ flex: 1.35, minWidth: 0 }}>
                    {canEditDraft && canEditLineDiscount(line) ? (
                      <FormControl size="small" fullWidth>
                        <InputLabel id={`mobile-discount-type-${index}`}>
                          Discount
                        </InputLabel>
                        <Select
                          labelId={`mobile-discount-type-${index}`}
                          label="Discount"
                          value={line.discount_type || "none"}
                          onChange={(e) =>
                            setLineValue(index, {
                              discount_type: e.target.value,
                            })
                          }
                        >
                          {DISCOUNT_TYPE_OPTIONS.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Discount
                        </Typography>
                        <Typography variant="body2">
                          {line.discount_type || "none"}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {canEditDraft && canEditLineDiscount(line) ? (
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Value"
                        value={line.discount_value ?? 0}
                        onChange={(e) =>
                          setLineValue(index, {
                            discount_value: e.target.value,
                          })
                        }
                        inputProps={{
                          min: 0,
                          step: line.discount_type === "percent" ? 1 : 100,
                          max:
                            line.discount_type === "percent"
                              ? 100
                              : undefined,
                        }}
                      />
                    ) : (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Value
                        </Typography>
                        <Typography variant="body2">
                          {line.discount_value ?? 0}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Stack>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid",
                    borderColor: "divider",
                    pt: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {formatMoney(line.line_total)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>

      <Box
        className="no-print"
        sx={{ display: { xs: "none", sm: "block" }, overflowX: "auto" }}
      >
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Label</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Discount</TableCell>
              <TableCell align="right">Value</TableCell>
              <TableCell align="right">Total</TableCell>
              {canEditDraft && <TableCell align="right">#</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={index}>
                <TableCell sx={{ minWidth: 140 }}>
                  {canEditDraft ? (
                    <FormControl size="small" fullWidth>
                      <InputLabel id={`type-label-${index}`}>Type</InputLabel>
                      <Select
                        labelId={`type-label-${index}`}
                        value={line.type || "other"}
                        label="Type"
                        onChange={(e) =>
                          handleLineTypeChange(index, e.target.value)
                        }
                      >
                        {LINE_TYPE_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Typography variant="body2">
                      {line.type || "other"}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ minWidth: 260 }}>
                  <InvoiceLineLabelEditor
                    line={line}
                    index={index}
                    canEditDraft={canEditDraft}
                    productOptions={productOptions}
                    packagePickerOptions={packagePickerOptions}
                    treatmentPickerOptions={treatmentPickerOptions}
                    autocompleteSlotProps={autocompleteSlotProps}
                    setLineValue={setLineValue}
                    handleLabelBlur={handleLabelBlur}
                  />
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 90 }}>
                  {canEditDraft && line.type !== "package_discount" ? (
                    <TextField
                      size="small"
                      type="number"
                      value={line.qty ?? ""}
                      onChange={(e) =>
                        setLineValue(index, { qty: e.target.value })
                      }
                      onBlur={() => {
                        const qty = Number(line.qty || 0);
                        if (qty <= 0) setLineValue(index, { qty: 1 });
                      }}
                      inputProps={{ min: 0, step: 1 }}
                    />
                  ) : (
                    <Typography variant="body2">{line.qty}</Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 120 }}>
                  {canEditDraft && line.type !== "package_discount" ? (
                    <TextField
                      size="small"
                      value={displayUnitPrice(line.unit_price)}
                      onChange={(e) =>
                        setLineValue(index, {
                          unit_price: sanitizeCommaAmountInput(e.target.value),
                        })
                      }
                      onBlur={() => handlePriceBlur(index)}
                      inputProps={{ inputMode: "decimal" }}
                      placeholder="e.g. 100,000"
                    />
                  ) : (
                    <Typography variant="body2">
                      {formatMoney(line.unit_price)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 120 }}>
                  {canEditDraft && canEditLineDiscount(line) ? (
                    <FormControl size="small" fullWidth>
                      <Select
                        value={line.discount_type || "none"}
                        onChange={(e) =>
                          setLineValue(index, {
                            discount_type: e.target.value,
                          })
                        }
                      >
                        {DISCOUNT_TYPE_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Typography variant="body2">
                      {line.discount_type || "none"}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 110 }}>
                  {canEditDraft && canEditLineDiscount(line) ? (
                    <TextField
                      size="small"
                      type="number"
                      value={line.discount_value ?? 0}
                      onChange={(e) =>
                        setLineValue(index, {
                          discount_value: e.target.value,
                        })
                      }
                      inputProps={{
                        min: 0,
                        step: line.discount_type === "percent" ? 1 : 100,
                        max:
                          line.discount_type === "percent" ? 100 : undefined,
                      }}
                    />
                  ) : (
                    <Typography variant="body2">
                      {line.discount_value ?? 0}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    color={
                      Number(line.line_total) < 0
                        ? "success.main"
                        : "text.primary"
                    }
                  >
                    {formatMoney(line.line_total)}
                  </Typography>
                </TableCell>
                {canEditDraft && (
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveLine(index)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </>
  );
}
