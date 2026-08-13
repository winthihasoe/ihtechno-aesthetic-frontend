import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import apiClient from "../../services/apiClient";

const DEFAULT_POLICY = {
  min_length: 12,
  check_compromised: false,
  requirements: [
    { id: "min_length", label: "At least 12 characters" },
    { id: "mixed_case", label: "Uppercase and lowercase letters" },
    { id: "number", label: "At least one number" },
    { id: "symbol", label: "At least one symbol" },
  ],
};

let cachedPolicy = null;
let policyPromise = null;

async function loadPasswordPolicy() {
  if (cachedPolicy) return cachedPolicy;
  if (!policyPromise) {
    policyPromise = apiClient
      .get("/auth/password-policy")
      .then(({ data }) => {
        cachedPolicy = data;
        return data;
      })
      .catch(() => DEFAULT_POLICY);
  }
  return policyPromise;
}

function evaluateRule(id, password, minLength) {
  switch (id) {
    case "min_length":
      return password.length >= minLength;
    case "mixed_case":
      return /[a-z]/.test(password) && /[A-Z]/.test(password);
    case "number":
      return /\d/.test(password);
    case "symbol":
      return /[^A-Za-z0-9]/.test(password);
    case "uncompromised":
      return true;
    default:
      return true;
  }
}

export function passwordMeetsPolicy(password, policy = cachedPolicy || DEFAULT_POLICY) {
  if (!password) return false;
  const minLength = policy?.min_length ?? 12;
  return (policy?.requirements ?? DEFAULT_POLICY.requirements).every((req) =>
    evaluateRule(req.id, password, minLength),
  );
}

export default function PasswordPolicyHint({ password, showWhenEmpty = false }) {
  const [policy, setPolicy] = useState(cachedPolicy || DEFAULT_POLICY);

  useEffect(() => {
    loadPasswordPolicy().then(setPolicy);
  }, []);

  const checks = useMemo(() => {
    const minLength = policy?.min_length ?? 12;
    return (policy?.requirements ?? []).map((req) => ({
      ...req,
      met: evaluateRule(req.id, password, minLength),
    }));
  }, [password, policy]);

  if (!showWhenEmpty && !password) {
    return (
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
        Password must meet the security requirements below.
      </Typography>
    );
  }

  return (
    <Box component="ul" sx={{ m: 0, mt: 0.5, p: 0, pl: 0, listStyle: "none" }}>
      {checks.map((check) => (
        <Box
          component="li"
          key={check.id}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            py: 0.15,
            color: check.met ? "success.main" : "text.secondary",
          }}
        >
          {check.met ? (
            <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
          ) : (
            <RadioButtonUncheckedIcon sx={{ fontSize: 14 }} />
          )}
          <Typography variant="caption" component="span">
            {check.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
