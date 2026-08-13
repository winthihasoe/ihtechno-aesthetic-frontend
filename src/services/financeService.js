import apiClient from "./apiClient";

export const getBranches = async () => {
  const { data } = await apiClient.get("/branches");
  return data;
};

export const listExpenses = async (params = {}) => {
  const { data } = await apiClient.get("/expenses", { params });
  return data;
};

export const createExpense = async (payload, idempotencyKey) => {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
  const { data } = await apiClient.post("/expenses", payload, { headers });
  return data;
};

/** @param {string} slug e.g. revenue, expenses, profit, cash-flow, receivables, payables */
export const getReportBySlug = async (slug, params = {}) => {
  const map = {
    revenue: "/reports/revenue",
    expenses: "/reports/expenses",
    profit: "/reports/profit",
    "cash-flow": "/reports/cash-flow",
    receivables: "/reports/receivables",
    payables: "/reports/payables",
    "package-liability": "/reports/package-liability",
    "treatment-profitability": "/reports/treatment-profitability",
    statements: "/reports/statements",
    reconciliation: "/reports/reconciliation",
  };
  const url = map[slug];
  if (!url) throw new Error(`Unknown report slug: ${slug}`);
  const { data } = await apiClient.get(url, { params });
  return data;
};

export const downloadReportExport = async (type, params = {}) => {
  const { format = "csv", ...query } = params;
  const response = await apiClient.get(`/reports/export/${type}`, {
    params: { ...query, format },
    responseType: "blob",
  });
  const ext = format === "html" ? "html" : "csv";
  const filename = `report-${type}.${ext}`;
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getSupplierPayables = async (params = {}) => {
  const { data } = await apiClient.get("/supplier-payables", { params });
  return data;
};

export const getSupplierPayable = async (id) => {
  const { data } = await apiClient.get(`/supplier-payables/${id}`);
  return data;
};

export const createSupplierPayable = async (payload, idempotencyKey) => {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
  const { data } = await apiClient.post("/supplier-payables", payload, { headers });
  return data;
};

export const paySupplierPayable = async (id, payload, idempotencyKey) => {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
  const { data } = await apiClient.post(`/supplier-payables/${id}/pay`, payload, { headers });
  return data;
};

export const voidSupplierPayable = async (id) => {
  const { data } = await apiClient.post(`/supplier-payables/${id}/void`);
  return data;
};

export const getFixedAssets = async () => {
  const { data } = await apiClient.get("/fixed-assets");
  return data;
};

export const createFixedAsset = async (payload, idempotencyKey) => {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
  const { data } = await apiClient.post("/fixed-assets", payload, { headers });
  return data;
};

export const postAssetDepreciation = async (assetId, payload) => {
  const { data } = await apiClient.post(`/fixed-assets/${assetId}/depreciations`, payload);
  return data;
};

export const listAccountingQueue = async (params = {}) => {
  const { data } = await apiClient.get("/accounting-queue", { params });
  return data;
};

export const getAccountingQueuePreview = async (sourceType, sourceId) => {
  const { data } = await apiClient.get(
    `/accounting-queue/${sourceType}/${sourceId}/preview`,
  );
  return data;
};

export const saveAccountingQueueDraft = async (sourceType, sourceId, payload) => {
  const { data } = await apiClient.put(
    `/accounting-queue/${sourceType}/${sourceId}/draft`,
    payload,
  );
  return data;
};

export const postAccountingQueueItem = async (sourceType, sourceId, payload) => {
  const { data } = await apiClient.post(
    `/accounting-queue/${sourceType}/${sourceId}/post`,
    payload,
  );
  return data;
};

export const getProfitAndLossReport = async (params = {}) => {
  const { data } = await apiClient.get("/reports/profit-and-loss", { params });
  return data;
};

export const getBalanceSheetReport = async (params = {}) => {
  const { data } = await apiClient.get("/reports/balance-sheet", { params });
  return data;
};

export const listCashFlows = async (params = {}) => {
  const { data } = await apiClient.get("/cash-flows", { params });
  return data;
};

export const listGeneralLedgerAccounts = async (params = {}) => {
  const { data } = await apiClient.get("/general-ledger/accounts", { params });
  return data;
};

export const listGeneralLedgerLines = async (accountId, params = {}) => {
  const { data } = await apiClient.get(`/general-ledger/accounts/${accountId}/lines`, {
    params,
  });
  return data;
};

export const downloadCashFlowsExport = async (params = {}) => {
  const response = await apiClient.get("/cash-flows/export", {
    params,
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "cash-transactions.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadGeneralLedgerExport = async (accountId, params = {}) => {
  const response = await apiClient.get(`/general-ledger/accounts/${accountId}/export`, {
    params,
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `general-ledger-${accountId}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const listJournalTransactions = async (params = {}) => {
  const { data } = await apiClient.get("/journal-transactions", { params });
  return data;
};

export const listJournalEntries = async (params = {}) => {
  const { data } = await apiClient.get("/journal-entries", { params });
  return data;
};

export const createManualJournalEntry = async (payload) => {
  const { data } = await apiClient.post("/journal-transactions", payload);
  return data;
};

export const syncManualJournalEntryLines = async (journalEntryId, payload) => {
  const { data } = await apiClient.put(
    `/journal-entries/${journalEntryId}/lines`,
    payload,
  );
  return data;
};

export const updateJournalTransactionLine = async (id, payload) => {
  const { data } = await apiClient.put(`/journal-transactions/${id}`, payload);
  return data;
};

export const voidJournalTransactionLine = async (id) => {
  const { data } = await apiClient.post(`/journal-transactions/${id}/void`);
  return data;
};

export const reverseJournalEntry = async (journalEntryId) => {
  const { data } = await apiClient.post(
    `/journal-entries/${journalEntryId}/reverse`,
  );
  return data;
};

export const getSuppliers = async () => {
  const { data } = await apiClient.get("/suppliers");
  return data;
};

export const listChartOfAccounts = async (params = {}) => {
  const { data } = await apiClient.get("/chart-of-accounts", { params });
  return data;
};

export const createChartOfAccount = async (payload) => {
  const { data } = await apiClient.post("/chart-of-accounts", payload);
  return data;
};

export const updateChartOfAccount = async (id, payload) => {
  const { data } = await apiClient.put(`/chart-of-accounts/${id}`, payload);
  return data;
};

export const listOtherIncomes = async (params = {}) => {
  const { data } = await apiClient.get("/other-incomes", { params });
  return data;
};

export const getOtherIncome = async (id) => {
  const { data } = await apiClient.get(`/other-incomes/${id}`);
  return data;
};

export const createOtherIncome = async (payload, idempotencyKey) => {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
  const { data } = await apiClient.post("/other-incomes", payload, { headers });
  return data;
};

export const updateOtherIncome = async (id, payload, idempotencyKey) => {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
  const { data } = await apiClient.put(`/other-incomes/${id}`, payload, { headers });
  return data;
};

export const voidOtherIncome = async (id, payload = {}, idempotencyKey) => {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
  const { data } = await apiClient.post(`/other-incomes/${id}/void`, payload, { headers });
  return data;
};
