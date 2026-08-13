import apiClient from "./apiClient";

export const getCommissions = (params = {}) =>
  apiClient.get("/commissions", { params }).then((r) => r.data);

export const getCommissionSummary = (params = {}) =>
  apiClient.get("/commissions/summary", { params }).then((r) => r.data);

export const getMyCommissions = (params = {}) =>
  getCommissions({ ...params, mine: true });

export const getMyCommissionSummary = (params = {}) =>
  getCommissionSummary({ ...params, mine: true });
