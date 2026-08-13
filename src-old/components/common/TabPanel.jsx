import { Box } from "@mui/material";

export default function TabPanel({ value, index, children, sx }) {
  if (value !== index) return null;

  return <Box sx={{ pt: 2.5, ...sx }}>{children}</Box>;
}
