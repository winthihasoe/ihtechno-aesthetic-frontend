import Box from "@mui/material/Box";
import { financeCoaCodeSx } from "./financeTokens";

function normalizeText(value) {
  if (value == null) return "";
  return String(value).trim();
}

export default function FinanceCoaAccountLabel({
  code,
  name,
  separator = " · ",
  nameFirst = false,
  emptyLabel = "—",
}) {
  const codeText = normalizeText(code);
  const nameText = normalizeText(name);

  if (!codeText && !nameText) {
    return emptyLabel;
  }

  const codeEl = codeText ? (
    <Box component="span" sx={financeCoaCodeSx}>
      {codeText}
    </Box>
  ) : null;
  const nameEl = nameText ? (
    <Box component="span">{nameText}</Box>
  ) : null;

  if (nameFirst) {
    return (
      <>
        {nameEl}
        {nameEl && codeEl ? separator : null}
        {codeEl}
      </>
    );
  }

  return (
    <>
      {codeEl}
      {codeEl && nameEl ? separator : null}
      {nameEl}
    </>
  );
}
