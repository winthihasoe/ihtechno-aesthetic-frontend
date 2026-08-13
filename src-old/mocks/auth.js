// Mock users — one per role
export const MOCK_USERS = [
  {
    id: 1,
    name: "Htet Htet",
    email: "admin@dermafairy.com",
    password: "password",
    role: "admin",
    avatar: "HH",
  },
  {
    id: 2,
    name: "May May",
    email: "reception@dermafairy.com",
    password: "password",
    role: "reception",
    avatar: "MM",
  },
  {
    id: 3,
    name: "Dr. Kyaw Kyaw",
    email: "medical-officer@dermafairy.com",
    password: "password",
    role: "medical_officer",
    avatar: "KK",
  },
  {
    id: 4,
    name: "Hnin Hnin",
    email: "therapist@dermafairy.com",
    password: "password",
    role: "therapist",
    avatar: "HN",
  },
  {
    id: 5,
    name: "Zin Zin",
    email: "cashier@dermafairy.com",
    password: "password",
    role: "cashier",
    avatar: "ZZ",
  },
];

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockLogin = async (email, password) => {
  await delay();
  const user = MOCK_USERS.find(
    (u) => u.email === email && u.password === password,
  );
  if (!user) throw new Error("Invalid email or password");
  const { password: _, ...safeUser } = user;
  return { user: safeUser, token: `mock-token-${safeUser.id}` };
};
