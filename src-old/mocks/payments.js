import dayjs from "dayjs";

export const MOCK_PAYMENTS = [
  {
    id: 1,
    visitId: 7,
    patientName: "Indah Lestari",
    amount: 500000,
    status: "paid",
    paidAt: dayjs().subtract(30, "minute").toISOString(),
    items: [
      { name: "Consultation", price: 200000 },
      { name: "Facial Treatment", price: 300000 },
    ],
  },
  {
    id: 2,
    visitId: 8,
    patientName: "Laras Ayu",
    amount: 1200000,
    status: "paid",
    paidAt: dayjs().subtract(60, "minute").toISOString(),
    items: [
      { name: "Consultation", price: 200000 },
      { name: "Botox", price: 1000000 },
    ],
  },
  {
    id: 3,
    visitId: 6,
    patientName: "Putri Anggraini",
    amount: 850000,
    status: "unpaid",
    paidAt: null,
    items: [
      { name: "Consultation", price: 200000 },
      { name: "Chemical Peel", price: 650000 },
    ],
  },
];

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockGetPayments = async () => {
  await delay();
  return [...MOCK_PAYMENTS];
};

export const mockGetPayment = async (id) => {
  await delay();
  const payment = MOCK_PAYMENTS.find((p) => p.id === Number(id));
  if (!payment) throw new Error("Payment not found");
  return payment;
};

export const mockMarkPaymentPaid = async (id) => {
  await delay(200);
  const idx = MOCK_PAYMENTS.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("Payment not found");
  MOCK_PAYMENTS[idx].status = "paid";
  MOCK_PAYMENTS[idx].paidAt = new Date().toISOString();
  return { ...MOCK_PAYMENTS[idx] };
};
