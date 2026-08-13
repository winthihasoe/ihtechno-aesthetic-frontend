import apiClient from "./apiClient";

export const getTransactionMethods = async () => {
  const { data } = await apiClient.get("/transaction-methods");
  return data;
};

export const createTransactionMethod = async (payload) => {
  const { data } = await apiClient.post("/transaction-methods", payload);
  return data;
};

export const updateTransactionMethod = async (id, payload) => {
  const { data } = await apiClient.put(`/transaction-methods/${id}`, payload);
  return data;
};

export const deleteTransactionMethod = async (id) => {
  const { data } = await apiClient.delete(`/transaction-methods/${id}`);
  return data;
};
