import { Chip, MenuItem, Stack } from "@mui/material";
import { isPickerProductOutOfStock } from "../../utils/productPickerUi";

export default function ProductPickerMenuItem({
  product,
  children,
  selectedValue = null,
  ...menuItemProps
}) {
  const outOfStock = isPickerProductOutOfStock(product);
  const isCurrentSelection =
    selectedValue != null &&
    product?.id != null &&
    String(selectedValue) === String(product.id);
  const disabled = Boolean(menuItemProps.disabled) || (outOfStock && !isCurrentSelection);

  return (
    <MenuItem {...menuItemProps} disabled={disabled}>
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        useFlexGap
        flexWrap="wrap"
      >
        <span>{children}</span>
        {outOfStock ? (
          <Chip
            size="small"
            label="Out of stock"
            color="error"
            variant="outlined"
          />
        ) : null}
      </Stack>
    </MenuItem>
  );
}
