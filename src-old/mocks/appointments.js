import dayjs from "dayjs";

export const MOCK_APPOINTMENTS = [
  {
    id: 1,
    patientId: 1,
    patientName: "Aung Aung",
    patientPhone: "0812-3456-7890",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    datetime: dayjs().add(1, "day").hour(10).minute(0).toISOString(),
    status: "confirmed",
    notes: "Facial treatment consult",
  },
  {
    id: 2,
    patientId: 2,
    patientName: "Hla Hla",
    patientPhone: "0813-9876-5432",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    datetime: dayjs().add(1, "day").hour(11).minute(30).toISOString(),
    status: "pending",
    notes: "",
  },
  {
    id: 3,
    patientId: 5,
    patientName: "Khin Khin",
    patientPhone: "0878-5555-6666",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    datetime: dayjs().add(2, "day").hour(9).minute(0).toISOString(),
    status: "confirmed",
    notes: "Acne follow-up",
  },
  {
    id: 4,
    patientId: 6,
    patientName: "Kyaw Kyaw",
    patientPhone: "0812-7777-8888",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    datetime: dayjs().subtract(1, "day").hour(14).minute(0).toISOString(),
    status: "completed",
    notes: "",
  },
  {
    id: 5,
    patientId: 8,
    patientName: "Zaw Zaw",
    patientPhone: "0877-1234-5678",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    datetime: dayjs().add(3, "day").hour(15).minute(30).toISOString(),
    status: "pending",
    notes: "Botox top-up",
  },
  {
    id: 6,
    patientId: 4,
    patientName: "Aye Aye",
    patientPhone: "0856-3333-4444",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    datetime: dayjs().subtract(2, "day").hour(10).minute(0).toISOString(),
    status: "cancelled",
    notes: "Patient cancelled",
  },
];

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockGetAppointments = async () => {
  await delay();
  return [...MOCK_APPOINTMENTS];
};

export const mockUpdateAppointment = async (id, updates) => {
  await delay(200);
  const idx = MOCK_APPOINTMENTS.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error("Appointment not found");
  Object.assign(MOCK_APPOINTMENTS[idx], updates);
  return { ...MOCK_APPOINTMENTS[idx] };
};
