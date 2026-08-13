import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SpaOutlinedIcon from "@mui/icons-material/SpaOutlined";
import CardGiftcardOutlinedIcon from "@mui/icons-material/CardGiftcardOutlined";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import useAuthStore from "../stores/authStore";
import { resolveApiError } from "../services/apiClient";
import { hasPermission } from "../utils/accessUtils";
import { formatKyats } from "../utils/formatKyats";
import { getProducts } from "./inventory/inventoryService";
import { getTreatmentTemplates } from "../services/treatmentTemplateService";
import { getPackages } from "../services/packageService";

const TYPE_STYLES = {
  product: {
    label: "Product",
    color: "#2563eb",
    Icon: Inventory2OutlinedIcon,
  },
  treatment: {
    label: "Treatment",
    color: "#7c3aed",
    Icon: SpaOutlinedIcon,
  },
  package: {
    label: "Package",
    color: "#156534",
    Icon: CardGiftcardOutlinedIcon,
  },
};

function nameMatches(query, name) {
  if (!name) return false;
  return name.toLowerCase().includes(query.toLowerCase());
}

function stockStatusChipColor(status) {
  if (status === "out") return "error";
  if (status === "low") return "warning";
  return "success";
}

function stockStatusLabel(status) {
  if (status === "out") return "Out of stock";
  if (status === "low") return "Low stock";
  return "In stock";
}

function activeStatusChip(isActive) {
  return {
    label: isActive ? "Active" : "Inactive",
    color: isActive ? "success" : "default",
    variant: isActive ? "filled" : "outlined",
  };
}

function formatDurationMinutes(minutes) {
  if (minutes == null || minutes === "") return "—";
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const remainder = value % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function formatProductUnit(product) {
  const useUnit = product.use_unit_name ?? product.unit;
  if (!useUnit) return "—";
  if (product.uses_pack_conversion && product.stock_unit_name) {
    return `${useUnit} · buy in ${product.stock_unit_name}`;
  }
  return useUnit;
}

function formatProductStock(product) {
  if (product.on_hand_display) return product.on_hand_display;
  const qty = product.total_stock ?? 0;
  const unit = product.use_unit_name ?? product.unit ?? "";
  return `${qty}${unit ? ` ${unit}` : ""}`;
}

function MetaItem({ label, value, emphasize = false }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        display: "flex",
        flexDirection: { xs: "row", sm: "column" },
        gap: 0.5,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: "block",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontSize: "0.68rem",
        }}
      >
        {label}:
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontWeight: emphasize ? 700 : 500,
          color: emphasize ? "text.primary" : "text.secondary",
          lineHeight: 1.4,
          wordBreak: "break-word",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function EmptyResultsState({ query }) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, sm: 4 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        textAlign: "center",
        bgcolor: alpha(
          theme.palette.primary.main,
          theme.palette.mode === "dark" ? 0.1 : 0.045,
        ),
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 999,
          mx: "auto",
          mb: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(
            theme.palette.primary.main,
            theme.palette.mode === "dark" ? 0.18 : 0.12,
          ),
        }}
      >
        <SearchOffOutlinedIcon
          sx={{
            fontSize: 28,
            color: theme.palette.primary.main,
          }}
        />
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        No results found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {query
          ? `No matches for “${query}”. Try searching by SKU, generic name, or a shorter keyword.`
          : "No matches in the catalogs you can access."}
      </Typography>
    </Paper>
  );
}

function SearchResultCard({
  type,
  title,
  subtitle,
  priceLabel,
  priceText,
  meta = [],
  statusChip,
}) {
  const theme = useTheme();
  const typeStyle = TYPE_STYLES[type];
  const TypeIcon = typeStyle.Icon;

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1.25 }}
        >
          <Chip
            icon={<TypeIcon sx={{ fontSize: "16px !important" }} />}
            label={typeStyle.label}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: alpha(typeStyle.color, 0.1),
              color: typeStyle.color,
              border: "none",
              "& .MuiChip-icon": { color: typeStyle.color },
            }}
          />
          {statusChip ? (
            <Chip
              label={statusChip.label}
              color={statusChip.color}
              variant={statusChip.variant}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          ) : null}
        </Stack>

        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, lineHeight: 1.35, mb: subtitle ? 0.5 : 1.25 }}
        >
          {title}
        </Typography>

        {subtitle ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1.25 }}
          >
            {subtitle}
          </Typography>
        ) : null}

        {meta.length > 0 ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr" },
              gap: 1.25,
              mt: "auto",
            }}
          >
            {meta.map((item) => (
              <MetaItem
                key={item.label}
                label={item.label}
                value={item.value}
                emphasize={item.emphasize}
              />
            ))}
          </Box>
        ) : null}
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: alpha(
            typeStyle.color,
            theme.palette.mode === "dark" ? 0.12 : 0.06,
          ),
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 600,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          {priceLabel}
        </Typography>
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, lineHeight: 1.2, my: 0.25, pb: 1 }}
        >
          {priceText}
        </Typography>
      </Box>
    </Paper>
  );
}

function Section({ title, count, error, children }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ mb: 1.75 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {count > 0 ? (
          <Chip
            label={count}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        ) : null}
      </Stack>
      {error ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      ) : null}
      {children}
    </Box>
  );
}

export default function SearchResultPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const q = useMemo(() => (searchParams.get("q") ?? "").trim(), [searchParams]);

  const canProducts = hasPermission(user, "inventory.view");
  const canTemplates = hasPermission(user, "treatment_templates.view");
  const canPackages = hasPermission(user, "packages.view");

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [packages, setPackages] = useState([]);
  const [errProducts, setErrProducts] = useState(null);
  const [errTemplates, setErrTemplates] = useState(null);
  const [errPackages, setErrPackages] = useState(null);

  useEffect(() => {
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProducts([]);
      setTemplates([]);
      setPackages([]);
      setErrProducts(null);
      setErrTemplates(null);
      setErrPackages(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErrProducts(null);
      setErrTemplates(null);
      setErrPackages(null);

      const jobs = [];

      if (canProducts) {
        jobs.push(
          (async () => {
            try {
              const data = await getProducts({ search: q });
              if (!cancelled) setProducts(Array.isArray(data) ? data : []);
            } catch (e) {
              if (!cancelled) {
                setProducts([]);
                setErrProducts(resolveApiError(e, "Could not load products."));
              }
            }
          })(),
        );
      } else if (!cancelled) {
        setProducts([]);
      }

      if (canTemplates) {
        jobs.push(
          (async () => {
            try {
              const data = await getTreatmentTemplates();
              const list = Array.isArray(data) ? data : [];
              const filtered = list.filter((row) => nameMatches(q, row.name));
              if (!cancelled) setTemplates(filtered);
            } catch (e) {
              if (!cancelled) {
                setTemplates([]);
                setErrTemplates(
                  resolveApiError(e, "Could not load treatments."),
                );
              }
            }
          })(),
        );
      } else if (!cancelled) {
        setTemplates([]);
      }

      if (canPackages) {
        jobs.push(
          (async () => {
            try {
              const data = await getPackages();
              const list = Array.isArray(data) ? data : [];
              const filtered = list.filter((row) => nameMatches(q, row.name));
              if (!cancelled) setPackages(filtered);
            } catch (e) {
              if (!cancelled) {
                setPackages([]);
                setErrPackages(resolveApiError(e, "Could not load packages."));
              }
            }
          })(),
        );
      } else if (!cancelled) {
        setPackages([]);
      }

      await Promise.all(jobs);
      if (!cancelled) setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [q, canProducts, canTemplates, canPackages]);

  const productNodes = products.map((product) => (
    <Grid key={`p-${product.id}`} size={{ xs: 12, sm: 6, lg: 4 }}>
      <SearchResultCard
        type="product"
        title={product.name}
        subtitle={
          product.generic_name && product.generic_name !== product.name
            ? product.generic_name
            : (product.category?.name ?? null)
        }
        priceLabel="Selling price"
        priceText={formatKyats(product.selling_price)}
        statusChip={{
          label: stockStatusLabel(product.stock_status),
          color: stockStatusChipColor(product.stock_status),
          variant: "outlined",
        }}
        meta={[
          { label: "SKU", value: product.sku?.trim() ? product.sku : "—" },
          { label: "Unit", value: formatProductUnit(product) },
          {
            label: "Stock",
            value: formatProductStock(product),
            emphasize: true,
          },
          {
            label: "Pack size",
            value:
              product.pack_preview ??
              (product.uses_pack_conversion ? "—" : "Single unit"),
          },
        ]}
      />
    </Grid>
  ));

  const templateNodes = templates.map((template) => (
    <Grid key={`t-${template.id}`} size={{ xs: 12, sm: 6, lg: 4 }}>
      <SearchResultCard
        type="treatment"
        title={template.name}
        subtitle={template.category?.name ?? null}
        priceLabel="Treatment price"
        priceText={formatKyats(template.price)}
        statusChip={activeStatusChip(Boolean(template.is_active))}
        meta={[
          {
            label: "Duration",
            value: formatDurationMinutes(template.duration_minutes),
            emphasize: true,
          },
          {
            label: "Status",
            value: template.is_active ? "Available for booking" : "Not offered",
          },
          {
            label: "Sessions logged",
            value:
              template.treatments_count != null
                ? String(template.treatments_count)
                : "—",
          },
        ]}
      />
    </Grid>
  ));

  const packageNodes = packages.map((pkg) => (
    <Grid key={`k-${pkg.id}`} size={{ xs: 12, sm: 6, lg: 4 }}>
      <SearchResultCard
        type="package"
        title={pkg.name}
        subtitle={pkg.description?.trim() ? pkg.description : null}
        priceLabel="Package price"
        priceText={formatKyats(pkg.price)}
        statusChip={activeStatusChip(Boolean(pkg.is_active))}
        meta={[
          {
            label: "Validity",
            value:
              pkg.validity_days != null
                ? `${pkg.validity_days} day${Number(pkg.validity_days) === 1 ? "" : "s"}`
                : "—",
            emphasize: true,
          },
          {
            label: "Status",
            value: pkg.is_active ? "Available for sale" : "Not offered",
          },
          {
            label: "Included treatments",
            value: pkg.items_count != null ? String(pkg.items_count) : "—",
          },
        ]}
      />
    </Grid>
  ));

  const totalCount =
    productNodes.length + templateNodes.length + packageNodes.length;

  return (
    <Box maxWidth="1280px">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        size="small"
        sx={{ mb: 1.5 }}
      >
        Back
      </Button>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          Price Lookup
        </Typography>

        {q && !loading ? (
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
            <Chip
              label={`${totalCount} total`}
              size="small"
              color="primary"
              variant="outlined"
            />
            {canProducts ? (
              <Chip
                label={`${products.length} products`}
                size="small"
                variant="outlined"
              />
            ) : null}
            {canTemplates ? (
              <Chip
                label={`${templates.length} treatments`}
                size="small"
                variant="outlined"
              />
            ) : null}
            {canPackages ? (
              <Chip
                label={`${packages.length} packages`}
                size="small"
                variant="outlined"
              />
            ) : null}
          </Stack>
        ) : null}
      </Box>
      <Divider sx={{ my: 2 }} />

      {!q ? (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            borderRadius: 2.5,
            borderStyle: "dashed",
          }}
        >
          <Typography color="text.secondary">
            Type a product, treatment, or package name and press Enter to see
            selling prices, stock levels, duration, and package validity.
          </Typography>
        </Paper>
      ) : loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={36} />
        </Box>
      ) : totalCount === 0 && !errProducts && !errTemplates && !errPackages ? (
        <EmptyResultsState query={q} />
      ) : (
        <Stack spacing={0} divider={<Divider sx={{ mb: 4 }} />}>
          {canProducts ? (
            <Section
              title="Products"
              count={products.length}
              error={errProducts}
            >
              {productNodes.length === 0 && !errProducts ? (
                <Typography variant="body2" color="text.secondary">
                  No matching products.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {productNodes}
                </Grid>
              )}
            </Section>
          ) : null}

          {canTemplates ? (
            <Section
              title="Treatments"
              count={templates.length}
              error={errTemplates}
            >
              {templateNodes.length === 0 && !errTemplates ? (
                <Typography variant="body2" color="text.secondary">
                  No matching treatments.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {templateNodes}
                </Grid>
              )}
            </Section>
          ) : null}

          {canPackages ? (
            <Section
              title="Packages"
              count={packages.length}
              error={errPackages}
            >
              {packageNodes.length === 0 && !errPackages ? (
                <Typography variant="body2" color="text.secondary">
                  No matching packages.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {packageNodes}
                </Grid>
              )}
            </Section>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}
