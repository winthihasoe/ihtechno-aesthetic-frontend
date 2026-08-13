import { useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
  FINANCE_GUIDE_LANG_KEY,
  financeGuideDismissKey,
  getGuideUi,
  getPageGuide,
  readFinanceGuideDismissed,
  readFinanceGuideLang,
} from "../../content/financeGuideContent";
import { rolePrefixFromPathname } from "../../utils/financeSourceNavigation";

/**
 * Collapsible bilingual accounting help for finance pages.
 * @param {{ pageId: string, defaultOpen?: boolean, sx?: object }} props
 */
export default function FinanceGuidePanel({
  pageId,
  defaultOpen = true,
  sx,
}) {
  const location = useLocation();
  const prefix = rolePrefixFromPathname(location.pathname);

  const [guideOpen, setGuideOpen] = useState(() => {
    if (!defaultOpen) return false;
    return !readFinanceGuideDismissed(pageId);
  });
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [guideLang, setGuideLang] = useState(readFinanceGuideLang);

  const page = getPageGuide(guideLang, pageId);
  const ui = getGuideUi(guideLang);

  if (!page) return null;

  const setGuideLanguage = (lang) => {
    setGuideLang(lang);
    try {
      localStorage.setItem(FINANCE_GUIDE_LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  };

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(financeGuideDismissKey(pageId), "1");
      } catch {
        /* ignore */
      }
    }
    setGuideOpen(false);
  };

  const hubHref = `${prefix}/finance/accounting-guide${
    page.hubAnchor ? `#${page.hubAnchor}` : ""
  }`;

  return (
    <Collapse in={guideOpen} sx={sx}>
      <Paper
        variant="outlined"
        sx={{
          mb: 2,
          borderRadius: 2,
          borderColor: "divider",
          bgcolor: (t) =>
            alpha(
              t.palette.info.main,
              t.palette.mode === "dark" ? 0.14 : 0.08,
            ),
          borderLeftWidth: 4,
          borderLeftStyle: "solid",
          borderLeftColor: "info.main",
        }}
      >
        <Stack
          spacing={1.5}
          sx={{
            p: 2.5,
            pt: 2,
            ...(guideLang === "my"
              ? {
                  fontFamily:
                    '"Noto Sans Myanmar","Pyidaungsu","Myanmar Text","Padauk",sans-serif',
                }
              : {}),
          }}
          lang={guideLang === "my" ? "my" : "en"}
        >
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="flex-start"
              flex="1 1 200px"
            >
              <HelpOutlineIcon color="info" sx={{ mt: 0.25 }} />
              <Box minWidth={0}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  color="text.primary"
                >
                  {page.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.25 }}
                >
                  {page.subtitle}
                </Typography>
              </Box>
            </Stack>
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              flexShrink={0}
            >
              <ToggleButtonGroup
                size="small"
                value={guideLang}
                exclusive
                onChange={(_, v) => v && setGuideLanguage(v)}
                aria-label="Guide language"
              >
                <ToggleButton value="my" sx={{ textTransform: "none", px: 1.25 }}>
                  {ui.toggleMy}
                </ToggleButton>
                <ToggleButton value="en" sx={{ textTransform: "none", px: 1.25 }}>
                  {ui.toggleEn}
                </ToggleButton>
              </ToggleButtonGroup>
              <IconButton
                size="small"
                onClick={handleClose}
                aria-label={ui.close}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {page.bullets.map((bullet, idx) => (
              <Typography
                component="li"
                variant="body2"
                color="text.secondary"
                key={idx}
                sx={{ mb: 0.75, lineHeight: 1.65 }}
              >
                {bullet}
              </Typography>
            ))}
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            spacing={1}
          >
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  {ui.dontShowAgain}
                </Typography>
              }
            />
            <Button
              component={RouterLink}
              to={hubHref}
              size="small"
              variant="outlined"
              color="primary"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                px: 1.75,
              }}
            >
              {ui.readMore}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Collapse>
  );
}
