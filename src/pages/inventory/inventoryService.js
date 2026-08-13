import apiClient from "../../services/apiClient";

// ── Alerts ────────────────────────────────────
export const getInventoryAlerts = (params = {}) =>
  apiClient.get("/inventory/alerts", { params }).then((r) => r.data);

export const getStockMovementsList = (params = {}) =>
  apiClient.get("/inventory/stock-movements", { params }).then((r) => r.data);

export const getConsignmentReport = (params = {}) =>
  apiClient.get("/inventory/consignment-report", { params }).then((r) => r.data);

export const getConsignmentSettlement = (params = {}) =>
  apiClient
    .get("/inventory/consignment-settlement", { params })
    .then((r) => r.data);

// ── Categories ────────────────────────────────
export const getCategories = () =>
  apiClient.get("/product-categories").then((r) => r.data);

export const createCategory = (data) =>
  apiClient.post("/product-categories", data).then((r) => r.data);

// ── Units ───────────────────────────────────────
export const getProductUnits = () =>
  apiClient.get("/product-units").then((r) => r.data);

export const createProductUnit = (data) =>
  apiClient.post("/product-units", data).then((r) => r.data);

// ── Types ───────────────────────────────────────
export const getProductTypes = () =>
  apiClient.get("/product-types").then((r) => r.data);

export const createProductType = (data) =>
  apiClient.post("/product-types", data).then((r) => r.data);

// ── Products ──────────────────────────────────
export const getProducts = (params = {}) =>
  apiClient.get("/products", { params }).then((r) => r.data);

export const searchProducts = (query) =>
  apiClient
    .get("/products/autocomplete", { params: { search: query, limit: 20 } })
    .then((r) => r.data);

export const getProduct = (id) =>
  apiClient.get(`/products/${id}`).then((r) => r.data);

export const createProduct = (data) =>
  apiClient.post("/products", data).then((r) => r.data);

export const updateProduct = (id, data) =>
  apiClient.put(`/products/${id}`, data).then((r) => r.data);

export const deleteProduct = (id) =>
  apiClient.delete(`/products/${id}`).then((r) => r.data);

export const getBatches = (productId) =>
  apiClient.get(`/products/${productId}/batches`).then((r) => r.data);

export const getMovements = (productId) =>
  apiClient.get(`/products/${productId}/movements`).then((r) => r.data);

export const adjustStock = (productId, data) =>
  apiClient.post(`/products/${productId}/adjust`, data).then((r) => r.data);

// ── Suppliers ─────────────────────────────────
export const getSuppliers = () =>
  apiClient.get("/suppliers").then((r) => r.data);

export const createSupplier = (data) =>
  apiClient.post("/suppliers", data).then((r) => r.data);

export const updateSupplier = (id, data) =>
  apiClient.put(`/suppliers/${id}`, data).then((r) => r.data);

export const deleteSupplier = (id) =>
  apiClient.delete(`/suppliers/${id}`).then((r) => r.data);

// ── Purchases ─────────────────────────────────
export const getPurchases = () =>
  apiClient.get("/purchases").then((r) => r.data);

export const getPurchase = (id) =>
  apiClient.get(`/purchases/${id}`).then((r) => r.data);

export const createPurchase = (data) =>
  apiClient.post("/purchases", data).then((r) => r.data);
