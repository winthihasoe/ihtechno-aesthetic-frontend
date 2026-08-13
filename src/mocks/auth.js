import { isDemoMode } from "../config/demoMode";
import { demoPasswords, getDemoStore } from "./demoDatabase";

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const MOCK_USERS = getDemoStore().users.map((user) => ({
  ...user,
  password: demoPasswords[user.email] ?? "password",
}));

export const mockLogin = async (email, password) => {
  await delay();
  const user = getDemoStore().users.find((u) => u.email === email);
  if (!user || demoPasswords[email] !== password) {
    throw new Error("Invalid email or password");
  }
  return { user, token: `mock-token-${user.id}` };
};

export const mockMe = async (token) => {
  await delay(100);
  if (!token || !String(token).startsWith("mock-token-")) {
    throw new Error("Unauthenticated");
  }
  const id = Number(String(token).replace("mock-token-", ""));
  const user = getDemoStore().users.find((u) => u.id === id);
  if (!user) throw new Error("Unauthenticated");
  return user;
};

export { isDemoMode };
