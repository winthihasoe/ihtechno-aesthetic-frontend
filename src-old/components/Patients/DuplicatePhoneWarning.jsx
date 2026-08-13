import { useMemo } from "react";
import { Alert, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { rolePrefixFromPathname } from "../finance/JournalEntrySourceDetails";

export default function DuplicatePhoneWarning({ matches = [] }) {
  const location = useLocation();
  const patientBasePath = useMemo(() => {
    const prefix = rolePrefixFromPathname(location.pathname);
    return `${prefix}/patients`;
  }, [location.pathname]);

  if (!matches.length) return null;

  return (
    <Alert severity="warning" sx={{ mt: 1 }}>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        This phone number is already on file for:
      </Typography>
      <Stack spacing={0.25}>
        {matches.map((p) => (
          <Link
            key={p.id}
            component={RouterLink}
            to={`${patientBasePath}/${p.id}`}
            variant="body2"
            underline="hover"
          >
            {p.name} (#{p.id})
          </Link>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
        You can still save — duplicate phones are allowed (e.g. family/shared numbers).
      </Typography>
    </Alert>
  );
}
