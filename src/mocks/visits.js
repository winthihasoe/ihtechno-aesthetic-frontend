import dayjs from "dayjs";

// Status: waiting | consulting | preparation | treatment | payment | completed
export const MOCK_VISITS = [
  {
    id: 1,
    patientId: 3,
    patientName: "Mya Mya",
    visitTime: dayjs().subtract(90, "minute").toISOString(),
    status: "waiting",
    doctorId: null,
    doctorName: null,
    therapistId: null,
    therapistName: null,
    queueNumber: "001",
  },
  {
    id: 2,
    patientId: 7,
    patientName: "Su Su",
    visitTime: dayjs().subtract(75, "minute").toISOString(),
    status: "waiting",
    doctorId: null,
    doctorName: null,
    therapistId: null,
    therapistName: null,
    queueNumber: "002",
  },
  {
    id: 3,
    patientId: 1,
    patientName: "Aung Aung",
    visitTime: dayjs().subtract(60, "minute").toISOString(),
    status: "consulting",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    therapistId: null,
    therapistName: null,
    queueNumber: "003",
  },
  {
    id: 4,
    patientId: 9,
    patientName: "Thida Thida",
    visitTime: dayjs().subtract(55, "minute").toISOString(),
    status: "consulting",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    therapistId: null,
    therapistName: null,
    queueNumber: "004",
  },
  {
    id: 5,
    patientId: 2,
    patientName: "Hla Hla",
    visitTime: dayjs().subtract(120, "minute").toISOString(),
    status: "treatment",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    therapistId: 4,
    therapistName: "Hnin Hnin",
    queueNumber: "005",
  },
  {
    id: 6,
    patientId: 8,
    patientName: "Zaw Zaw",
    visitTime: dayjs().subtract(150, "minute").toISOString(),
    status: "payment",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    therapistId: 4,
    therapistName: "Hnin Hnin",
    queueNumber: "006",
    paymentAmount: 850000,
  },
  {
    id: 7,
    patientId: 4,
    patientName: "Aye Aye",
    visitTime: dayjs().subtract(200, "minute").toISOString(),
    status: "completed",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    therapistId: 4,
    therapistName: "Hnin Hnin",
    queueNumber: "007",
    paymentAmount: 500000,
    paidAt: dayjs().subtract(30, "minute").toISOString(),
  },
  {
    id: 8,
    patientId: 5,
    patientName: "Khin Khin",
    visitTime: dayjs().subtract(180, "minute").toISOString(),
    status: "completed",
    doctorId: 3,
    doctorName: "Dr. Kyaw Kyaw",
    therapistId: 4,
    therapistName: "Hnin Hnin",
    queueNumber: "008",
    paymentAmount: 1200000,
    paidAt: dayjs().subtract(60, "minute").toISOString(),
  },
  {
    id: 9,
    patientId: 10,
    patientName: "Win Win",
    visitTime: dayjs().subtract(30, "minute").toISOString(),
    status: "waiting",
    doctorId: null,
    doctorName: null,
    therapistId: null,
    therapistName: null,
    queueNumber: "009",
  },
];

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockGetVisits = async () => {
  await delay();
  return [...MOCK_VISITS];
};

export const mockUpdateVisitStatus = async (visitId, updates) => {
  await delay(200);
  const idx = MOCK_VISITS.findIndex((v) => v.id === visitId);
  if (idx === -1) throw new Error("Visit not found");
  Object.assign(MOCK_VISITS[idx], updates);
  return { ...MOCK_VISITS[idx] };
};

export const mockCreateVisit = async (patientId, patientName) => {
  await delay();
  const queueNum = String(MOCK_VISITS.length + 1).padStart(3, "0");
  const visit = {
    id: MOCK_VISITS.length + 1,
    patientId,
    patientName,
    visitTime: new Date().toISOString(),
    status: "waiting",
    doctorId: null,
    doctorName: null,
    therapistId: null,
    therapistName: null,
    queueNumber: queueNum,
  };
  MOCK_VISITS.push(visit);
  return { ...visit };
};
