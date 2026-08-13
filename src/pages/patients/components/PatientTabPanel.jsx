import { Box } from "@mui/material";

export default function PatientTabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2.5 }}>{children}</Box> : null;
}
