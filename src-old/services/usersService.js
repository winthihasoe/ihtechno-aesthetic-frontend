import apiClient from "./apiClient";

export const getUsers = async () => {
  const { data } = await apiClient.get("/users");
  return data;
};

export const getAssignableRoles = async () => {
  const { data } = await apiClient.get("/users/assignable-roles");
  return data;
};

export const createUser = async (payload) => {
  const { data } = await apiClient.post("/users", payload);
  return data;
};

export const updateUser = async (id, payload) => {
  const { data } = await apiClient.put(`/users/${id}`, payload);
  return data;
};

export const deleteUser = async (id) => {
  const { data } = await apiClient.delete(`/users/${id}`);
  return data;
};
