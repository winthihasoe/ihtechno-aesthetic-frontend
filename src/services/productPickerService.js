import apiClient from "./apiClient";

export const getProductPickerOptions = () =>
  apiClient.get("/product-picker-options").then((r) => r.data);
