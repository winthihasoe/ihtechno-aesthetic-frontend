import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LinkIcon from "@mui/icons-material/Link";
import {
  FINANCE_GUIDE_LANG_KEY,
  getGuideUi,
  getHubGuide,
  readFinanceGuideLang,
} from "../../content/financeGuideContent";
import {
  FinancePageHeader,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  getCompactTableSx,
} from "../../components/finance";

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  window.history.replaceState(null, "", `#${id}`);
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function AccountingGuidePage() {
  const theme = useTheme();
  const [guideLang, setGuideLang] = useState(readFinanceGuideLang);
  const [activeSectionId, setActiveSectionId] = useState("");

  const hub = getHubGuide(guideLang);
  const ui = getGuideUi(guideLang);

  const setGuideLanguage = (lang) => {
    setGuideLang(lang);
    try {
      localStorage.setItem(FINANCE_GUIDE_LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  };

  const sectionNav = useMemo(
    () => hub.sections.map((s) => ({ id: s.id, label: s.title })),
    [hub.sections],
  );

  const sectionIds = useMemo(
    () => hub.sections.map((s) => s.id),
    [hub.sections],
  );

  useEffect(() => {
    if (sectionIds.length === 0) return;
    setActiveSectionId(sectionIds[0]);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSectionId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && sectionIds.includes(hash)) {
      requestAnimationFrame(() => scrollToSection(hash));
    }
  }, [sectionIds]);

  const handleNavClick = useCallback((id) => {
    setActiveSectionId(id);
    scrollToSection(id);
  }, []);

  const myanmarFont =
    guideLang === "my"
      ? {
          fontFamily:
            '"Noto Sans Myanmar","Pyidaungsu","Myanmar Text","Padauk",sans-serif',
        }
      : {};

  return (
    <FinancePanel>
      <FinancePanelHeader>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "flex-start" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <FinancePageHeader title={hub.title} subtitle={hub.subtitle} />
          <ToggleButtonGroup
            size="small"
            value={guideLang}
            exclusive
            onChange={(_, v) => v && setGuideLanguage(v)}
            aria-label="Guide language"
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value="my" sx={{ textTransform: "none", px: 1.25 }}>
              {ui.toggleMy}
            </ToggleButton>
            <ToggleButton value="en" sx={{ textTransform: "none", px: 1.25 }}>
              {ui.toggleEn}
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </FinancePanelHeader>

      {/* Horizontal on-this-page nav */}
      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          borderBottom: 1,
          borderColor: alpha(theme.palette.primary.main, 0.14),
          bgcolor: alpha(
            theme.palette.primary.main,
            theme.palette.mode === "light" ? 0.03 : 0.08,
          ),
          ...myanmarFont,
        }}
        lang={guideLang === "my" ? "my" : "en"}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.25}
          useFlexGap
        >
          <Typography
            variant="overline"
            sx={{
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "text.secondary",
              lineHeight: 1.2,
              flexShrink: 0,
              pt: { xs: 0, sm: 0.25 },
            }}
          >
            {ui.jumpNav}
          </Typography>
          <Stack
            direction="row"
            spacing={0.75}
            flexWrap="wrap"
            useFlexGap
            sx={{ flex: 1, minWidth: 0 }}
          >
            {sectionNav.map((item) => {
              const active = activeSectionId === item.id;
              return (
                <Chip
                  key={item.id}
                  label={item.label}
                  component="button"
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  variant={active ? "filled" : "outlined"}
                  color={active ? "primary" : "default"}
                  size="small"
                  sx={{
                    height: 30,
                    borderRadius: 5,
                    fontWeight: active ? 700 : 500,
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    ...(!active && {
                      borderColor: alpha(theme.palette.divider, 0.9),
                      bgcolor: alpha(
                        theme.palette.background.paper,
                        theme.palette.mode === "light" ? 0.6 : 0.4,
                      ),
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      },
                    }),
                  }}
                />
              );
            })}
          </Stack>
        </Stack>
      </Box>

      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          pb: 4,
          ...myanmarFont,
        }}
        lang={guideLang === "my" ? "my" : "en"}
      >
        {hub.sections.map((section, sectionIdx) => (
          <Box
            key={section.id}
            id={section.id}
            sx={{
              scrollMarginTop: 88,
              pt: sectionIdx === 0 ? 2.5 : 4,
              pb: 4,
              borderBottom: sectionIdx < hub.sections.length - 1 ? 1 : 0,
              borderColor: "divider",
            }}
          >
            <Typography
              variant="h6"
              fontWeight={800}
              color="text.primary"
              sx={{ mb: 2 }}
            >
              {section.title}
            </Typography>

            {(section.paragraphs ?? []).map((para, idx) => (
              <Typography
                key={idx}
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5, lineHeight: 1.75, maxWidth: 900 }}
              >
                {para}
              </Typography>
            ))}

            {section.bullets?.length ? (
              <Box
                component="ul"
                sx={{
                  m: 0,
                  pl: 2.5,
                  mb: 2.5,
                  maxWidth: 900,
                  "& li::marker": { color: "primary.main" },
                }}
              >
                {section.bullets.map((bullet, idx) => (
                  <Typography
                    component="li"
                    variant="body2"
                    color="text.secondary"
                    key={idx}
                    sx={{ mb: 1, lineHeight: 1.7 }}
                  >
                    {bullet}
                  </Typography>
                ))}
              </Box>
            ) : null}

            {section.matrixRows?.length ? (
              <Box sx={{ maxWidth: 960 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5, lineHeight: 1.65 }}
                >
                  {ui.postingMatrixCaption}
                </Typography>
                <FinancePanelTable>
                  <Table size="small" sx={getCompactTableSx}>
                    <TableHead>
                      <TableRow>
                        {(section.matrixHeaders ?? []).map((header) => (
                          <TableCell
                            key={header}
                            sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {section.matrixRows.map((row, idx) => (
                        <TableRow
                          key={idx}
                          hover
                          sx={{
                            "&:nth-of-type(even)": {
                              bgcolor: alpha(
                                theme.palette.primary.main,
                                theme.palette.mode === "light" ? 0.03 : 0.06,
                              ),
                            },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600, maxWidth: 220 }}>
                            {row.event}
                          </TableCell>
                          <TableCell>{row.stock}</TableCell>
                          <TableCell sx={{ fontSize: "0.8125rem" }}>
                            {row.gl}
                          </TableCell>
                          <TableCell>{row.who}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </FinancePanelTable>
              </Box>
            ) : null}
          </Box>
        ))}

        <Divider sx={{ mb: 2 }} />
        <Typography variant="caption" color="text.secondary">
          {guideLang === "my"
            ? "Accounting rules ပြောင်းလဲပါက developer နှင့် financeGuideContent.js ကို အတူ update လုပ်ပါ။"
            : "When accounting rules change, update financeGuideContent.js together with the backend specs."}
        </Typography>
      </Box>
    </FinancePanel>
  );
}
