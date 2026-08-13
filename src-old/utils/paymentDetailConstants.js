export const LINE_TYPE_OPTIONS = [
  { value: "consultation", label: "Consultation" },
  { value: "treatment", label: "Treatment" },
  { value: "package", label: "Package" },
  { value: "product", label: "Product" },
  { value: "prescription", label: "Prescription" },
  { value: "other", label: "Other" },
];

export const DISCOUNT_TYPE_OPTIONS = [
  { value: "none", label: "No discount" },
  { value: "percent", label: "Percent (%)" },
  { value: "fixed", label: "Fixed amount" },
];

export const DRAFT_REFRESHABLE_PAYMENT_STATUSES = new Set([
  "draft",
  "unpaid",
  "issued",
]);

export const PAYABLE_PAYMENT_STATUSES = new Set(["draft", "unpaid", "issued"]);

export const CUSTOM_PACKAGE_HEAD = {
  __invoiceLineCustom: true,
  id: "__custom_package__",
  name: "Custom package (type label & price)",
};

export const CUSTOM_TREATMENT_HEAD = {
  __invoiceLineCustom: true,
  id: "__custom_treatment__",
  name: "Custom treatment (type label & price)",
};

export const CATALOG_LABEL_TYPES = new Set([
  "product",
  "prescription",
  "treatment",
  "package",
]);

/** Line types that pick label, price, and product from inventory catalog. */
export const INVENTORY_CATALOG_LINE_TYPES = new Set(["product", "prescription"]);
