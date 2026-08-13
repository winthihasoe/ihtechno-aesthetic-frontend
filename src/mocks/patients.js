import dayjs from "dayjs";

export const MOCK_PATIENTS = [
  {
    id: 1,
    name: "Aung Aung",
    phone: "0812-3456-7890",
    dob: "1995-04-12",
    address: "Jl. Melati No.4, Jakarta",
    status: "active",
    lastVisit: dayjs().subtract(1, "day").toISOString(),
    notes: "Sensitive skin, prone to redness",
  },
  {
    id: 2,
    name: "Hla Hla",
    phone: "0813-9876-5432",
    dob: "1990-07-22",
    address: "Jl. Mawar No.10, Bandung",
    status: "active",
    lastVisit: dayjs().subtract(3, "day").toISOString(),
    notes: "",
  },
  {
    id: 3,
    name: "Mya Mya",
    phone: "0821-1111-2222",
    dob: "1998-01-05",
    address: "Jl. Kenanga No.7, Surabaya",
    status: "active",
    lastVisit: dayjs().toISOString(),
    notes: "First visit",
  },
  {
    id: 4,
    name: "Aye Aye",
    phone: "0856-3333-4444",
    dob: "1987-11-30",
    address: "Jl. Dahlia No.2, Jakarta",
    status: "active",
    lastVisit: dayjs().subtract(7, "day").toISOString(),
    notes: "",
  },
  {
    id: 5,
    name: "Khin Khin",
    phone: "0878-5555-6666",
    dob: "2000-06-15",
    address: "Jl. Anggrek No.1, Depok",
    status: "active",
    lastVisit: dayjs().subtract(14, "day").toISOString(),
    notes: "Acne treatment follow-up",
  },
  {
    id: 6,
    name: "Kyaw Kyaw",
    phone: "0812-7777-8888",
    dob: "1993-03-08",
    address: "Jl. Flamboyan No.5, Bekasi",
    status: "inactive",
    lastVisit: dayjs().subtract(30, "day").toISOString(),
    notes: "",
  },
  {
    id: 7,
    name: "Su Su",
    phone: "0819-9999-0000",
    dob: "1996-09-18",
    address: "Jl. Cempaka No.3, Bogor",
    status: "active",
    lastVisit: dayjs().toISOString(),
    notes: "",
  },
  {
    id: 8,
    name: "Zaw Zaw",
    phone: "0877-1234-5678",
    dob: "1991-12-25",
    address: "Jl. Tulip No.8, Tangerang",
    status: "active",
    lastVisit: dayjs().subtract(5, "day").toISOString(),
    notes: "Botox follow-up",
  },
  {
    id: 9,
    name: "Thida Thida",
    phone: "0857-8765-4321",
    dob: "1985-08-14",
    address: "Jl. Seroja No.12, Jakarta",
    status: "active",
    lastVisit: dayjs().subtract(2, "day").toISOString(),
    notes: "",
  },
  {
    id: 10,
    name: "Win Win",
    phone: "0811-2345-6789",
    dob: "2001-02-28",
    address: "Jl. Bougenville No.6, Bekasi",
    status: "active",
    lastVisit: dayjs().toISOString(),
    notes: "New patient referral",
  },
];

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockGetPatients = async (search = "", statusFilter = "") => {
  await delay();
  let result = [...MOCK_PATIENTS];
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (p) => p.name.toLowerCase().includes(q) || p.phone.includes(q),
    );
  }
  if (statusFilter) result = result.filter((p) => p.status === statusFilter);
  return result;
};

export const mockGetPatient = async (id) => {
  await delay();
  const patient = MOCK_PATIENTS.find((p) => p.id === Number(id));
  if (!patient) throw new Error("Patient not found");
  return patient;
};
