/** Shared defaults for New Product dialog (non-component module for react-refresh). */

export const ADD_NEW_UNIT_VALUE = "__add_new_unit__";
export const ADD_NEW_CATEGORY_VALUE = "__add_new_category__";
export const ADD_NEW_TYPE_VALUE = "__add_new_type__";

export function emptyNewProductForm() {
  return {
    name: "",
    generic_name: "",
    included_amount: "",
    sku: "",
    unit_id: "",
    category_id: "",
    product_type_id: "",
    min_stock_level: 0,
    selling_price: "",
    description: "",
  };
}
