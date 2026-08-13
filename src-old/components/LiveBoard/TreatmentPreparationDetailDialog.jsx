import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../common/LoadingIndicator";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { getTreatmentTemplate } from "../../services/treatmentTemplateService";
import { resolveApiError } from "../../services/apiClient";
import TreatmentStockWarningAlert from "./TreatmentStockWarningAlert";
import { getTreatmentStockWarnings } from "../../utils/treatmentStockWarnings";
export function getTemplateIdFromTreatment(treatment) {
  const template =
    treatment?.treatment_template ?? treatment?.treatmentTemplate;
  const top =
    treatment?.treatment_template_id ?? treatment?.treatmentTemplateId ?? null;
  const nestedId = template?.id ?? template?.template_id ?? null;
  const n = Number(top ?? nestedId ?? 0);
  return n > 0 ? n : null;
}

export function formatTreatmentDuration(treatment, template) {
  const tpl =
    template ?? treatment?.treatment_template ?? treatment?.treatmentTemplate;
  const minutes = tpl?.duration_minutes;
  if (minutes != null && minutes !== "") {
    return `${minutes} min`;
  }
  return null;
}

function normalizeTemplateProducts(template) {
  const rows = template?.template_products ?? template?.templateProducts ?? [];
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    id: row.id ?? row.product_id,
    name: row.product?.name ?? "Product",
    sku: row.product?.sku ?? null,
    defaultQuantity: row.default_quantity ?? 1,
    unit: row.unit ?? row.product?.unit ?? null,
    isRequired: row.is_required !== false,
  }));
}

function normalizeRequiredForms(template) {
  const links =
    template?.required_form_links ?? template?.requiredFormLinks ?? [];
  if (!Array.isArray(links)) return [];
  return links
    .map((link) => {
      const form = link.form_definition ?? link.formDefinition ?? {};
      const formType = form.form_type ?? form.formType ?? null;
      if (formType === "procedure") return null;
      return {
        formDefinitionId:
          link.form_definition_id ?? form.id ?? link.formDefinitionId ?? null,
        name: form.name ?? "Form",
        formType,
        isRequired: link.is_required !== false,
      };
    })
    .filter(Boolean);
}

function normalizeSteps(template) {
  const steps = template?.steps ?? [];
  if (!Array.isArray(steps)) return [];
  return [...steps].sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0));
}

function mergeTemplateData(embedded, fetched) {
  if (!embedded && !fetched) return null;
  if (!embedded) return fetched;
  if (!fetched) return embedded;
  return {
    ...embedded,
    ...fetched,
    name: fetched.name ?? embedded.name,
    description: fetched.description ?? embedded.description,
    duration_minutes: fetched.duration_minutes ?? embedded.duration_minutes,
    price: fetched.price ?? embedded.price,
    steps: normalizeSteps(fetched).length ? fetched.steps : embedded.steps,
    template_products: normalizeTemplateProducts(fetched).length
      ? (fetched.template_products ?? fetched.templateProducts)
      : (embedded.template_products ?? embedded.templateProducts),
    required_form_links: normalizeRequiredForms(fetched).length
      ? (fetched.required_form_links ?? fetched.requiredFormLinks)
      : (embedded.required_form_links ?? embedded.requiredFormLinks),
  };
}

function SectionHeading({ children }) {
  return (
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
      {children}
    </Typography>
  );
}

export default function TreatmentPreparationDetailDialog({
  open,
  onClose,
  treatment,
  checklistItems = [],
}) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [fetchedTemplate, setFetchedTemplate] = useState(null);

  const templateId = useMemo(
    () => (treatment ? getTemplateIdFromTreatment(treatment) : null),
    [treatment],
  );

  const embeddedTemplate = useMemo(() => {
    if (!treatment) return null;
    return treatment.treatment_template ?? treatment.treatmentTemplate ?? null;
  }, [treatment]);

  useEffect(() => {
    if (!open || !treatment) {
      setFetchedTemplate(null);
      setLoadError("");
      return;
    }
    if (!templateId) {
      setFetchedTemplate(null);
      setLoadError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");
    (async () => {
      try {
        const detail = await getTreatmentTemplate(templateId);
        if (!cancelled) setFetchedTemplate(detail);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            resolveApiError(err, "Could not load treatment preset details."),
          );
          setFetchedTemplate(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, treatment, templateId]);

  const template = useMemo(
    () => mergeTemplateData(embeddedTemplate, fetchedTemplate),
    [embeddedTemplate, fetchedTemplate],
  );

  const products = useMemo(
    () => normalizeTemplateProducts(template),
    [template],
  );
  const requiredForms = useMemo(
    () => normalizeRequiredForms(template),
    [template],
  );
  const steps = useMemo(() => normalizeSteps(template), [template]);
  const stockWarnings = useMemo(
    () => getTreatmentStockWarnings(treatment),
    [treatment],
  );
  const stockWarningByProductId = useMemo(() => {
    const map = new Map();
    for (const warning of stockWarnings) {
      if (warning.product_id != null) {
        map.set(Number(warning.product_id), warning);
      }
    }
    return map;
  }, [stockWarnings]);

  const checklistByFormId = useMemo(() => {
    const map = new Map();
    for (const row of checklistItems) {
      if (row?.form_definition_id != null) {
        map.set(Number(row.form_definition_id), row);
      }
    }
    return map;
  }, [checklistItems]);

  const treatmentName = treatment?.name ?? template?.name ?? "Treatment";
  const duration = formatTreatmentDuration(treatment, template);

  return (
    <Dialog
      sx={{ bgcolor: "background.default" }}
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ pr: 6 }}>{treatmentName}</DialogTitle>
      <DialogContent dividers>
        {!treatment ? (
          <Typography variant="body2" color="text.secondary">
            No treatment selected.
          </Typography>
        ) : (
          <Stack spacing={2.5}>
            {templateId && duration ? (
              <Chip size="small" label={`Duration: ${duration}`} />
            ) : templateId ? null : (
              <Alert severity="info" sx={{ py: 0.5 }}>
                Custom procedure — no preset template linked. Gather supplies
                from the doctor&apos;s plan or session notes.
              </Alert>
            )}

            {loadError ? <Alert severity="warning">{loadError}</Alert> : null}
            {stockWarnings.length > 0 ? (
              <TreatmentStockWarningAlert treatment={treatment} />
            ) : null}

            {template?.description ? (
              <Box>
                <SectionHeading>Overview</SectionHeading>
                <Typography variant="body2" color="text.secondary">
                  {template.description}
                </Typography>
              </Box>
            ) : null}

            {loading && templateId ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LoadingIndicator size={18} />
                <Typography variant="caption" color="text.secondary">
                  Loading preset details…
                </Typography>
              </Box>
            ) : null}

            <Box>
              <SectionHeading>Required products</SectionHeading>
              {products.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No preset products for this treatment.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {products.map((product) => {
                    const warning = stockWarningByProductId.get(
                      Number(product.id),
                    );
                    return (
                      <ListItem
                        key={product.id}
                        sx={{
                          border: "1px solid",
                          borderColor: warning ? "warning.main" : "divider",
                          borderRadius: 1,
                          mb: 0.75,
                          py: 0.75,
                        }}
                      >
                        <ListItemText
                          primary={product.name}
                          secondary={[
                            product.sku ? `SKU: ${product.sku}` : null,
                            `Qty: ${product.defaultQuantity}${
                              product.unit ? ` ${product.unit}` : ""
                            }`,
                            product.isRequired ? "Required" : "Optional",
                            warning ? "Short on stock" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          primaryTypographyProps={{
                            variant: "body2",
                            fontWeight: 600,
                          }}
                          secondaryTypographyProps={{ variant: "caption" }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>

            <Divider />

            <Box>
              <SectionHeading>Patient condition checks</SectionHeading>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Forms that must be completed before this treatment can proceed.
              </Typography>
              {requiredForms.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No patient condition forms linked to this preset.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {requiredForms.map((form) => {
                    const checklistRow = form.formDefinitionId
                      ? checklistByFormId.get(Number(form.formDefinitionId))
                      : null;
                    const complete = Boolean(checklistRow?.complete);
                    return (
                      <ListItem
                        key={form.formDefinitionId ?? form.name}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          mb: 0.75,
                          py: 0.75,
                        }}
                      >
                        {complete ? (
                          <CheckCircleOutlineIcon
                            color="success"
                            sx={{ mr: 1, fontSize: 22 }}
                          />
                        ) : (
                          <ErrorOutlineIcon
                            color="warning"
                            sx={{ mr: 1, fontSize: 22 }}
                          />
                        )}
                        <ListItemText
                          primary={form.name}
                          secondary={[
                            form.isRequired ? "Required" : "Optional",
                            checklistRow
                              ? complete
                                ? "Completed for this visit"
                                : "Not completed for this visit"
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          primaryTypographyProps={{
                            variant: "body2",
                            fontWeight: 600,
                          }}
                          secondaryTypographyProps={{ variant: "caption" }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>

            <Divider />

            <Box>
              <SectionHeading>Treatment instruction steps</SectionHeading>
              {steps.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No instruction steps defined for this preset.
                </Typography>
              ) : (
                <Stack component="ol" spacing={1.25} sx={{ m: 0, pl: 2.5 }}>
                  {steps.map((step, index) => (
                    <Box component="li" key={step.id ?? index}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {index + 1}. {step.title || "Step"}
                      </Typography>
                      {step.description ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.25, whiteSpace: "pre-wrap" }}
                        >
                          {step.description}
                        </Typography>
                      ) : null}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
