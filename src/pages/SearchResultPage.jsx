import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import useAuthStore from "../stores/authStore";
import { resolveApiError } from "../services/apiClient";
import { hasPermission } from "../utils/accessUtils";
import { formatKyats } from "../utils/formatKyats";
import { getProducts } from "./inventory/inventoryService";
import { getTreatmentTemplates } from "../services/treatmentTemplateService";
import { getPackages } from "../services/packageService";

function nameMatches(query, name) {
  if (!name) return false;
  return name.toLowerCase().includes(query.toLowerCase());
}

function ResultCard({ label, title, priceText }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: "100%",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
      }}
    >
      <Stack spacing={1}>
        <Chip label={label} size="small" variant="outlined" sx={{ alignSelf: "flex-start" }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {priceText}
        </Typography>
      </Stack>
    </Paper>
  );
}

function Section({ title, error, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
        {title}
      </Typography>
      {error ? (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      ) : null}
      {children}
    </Box>
  );
}

export default function SearchResultPage() {
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
                setErrTemplates(resolveApiError(e, "Could not load treatments."));
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

  const gridItem = (node) => (
    <Grid key={node.key} size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
      {node.el}
    </Grid>
  );

  const productNodes = products.map((p) => ({
    key: `p-${p.id}`,
    el: (
      <ResultCard
        label="Product"
        title={p.name}
        priceText={`Selling price: ${formatKyats(p.selling_price)}`}
      />
    ),
  }));

  const templateNodes = templates.map((t) => ({
    key: `t-${t.id}`,
    el: (
      <ResultCard
        label="Treatment"
        title={t.name}
        priceText={`Price: ${formatKyats(t.price)}`}
      />
    ),
  }));

  const packageNodes = packages.map((pkg) => ({
    key: `k-${pkg.id}`,
    el: (
      <ResultCard
        label="Package"
        title={pkg.name}
        priceText={`Price: ${formatKyats(pkg.price)}`}
      />
    ),
  }));

  const totalCount = productNodes.length + templateNodes.length + packageNodes.length;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 3 }, px: { xs: 0, sm: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Price lookup
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {q ? `Results for “${q}”` : "Enter a search term in the bar above."}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {!q ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Typography color="text.secondary">
            Type a product, treatment, or package name and press Enter to see selling and list prices.
          </Typography>
        </Paper>
      ) : loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={36} />
        </Box>
      ) : totalCount === 0 &&
        !errProducts &&
        !errTemplates &&
        !errPackages ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Typography color="text.secondary">No matches in the catalogs you can access.</Typography>
        </Paper>
      ) : (
        <Stack spacing={0}>
          {canProducts ? (
            <Section title="Products" error={errProducts}>
              {productNodes.length === 0 && !errProducts ? (
                <Typography variant="body2" color="text.secondary">
                  No matching products.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {productNodes.map((n) => gridItem(n))}
                </Grid>
              )}
            </Section>
          ) : null}

          {canTemplates ? (
            <Section title="Treatments" error={errTemplates}>
              {templateNodes.length === 0 && !errTemplates ? (
                <Typography variant="body2" color="text.secondary">
                  No matching treatments.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {templateNodes.map((n) => gridItem(n))}
                </Grid>
              )}
            </Section>
          ) : null}

          {canPackages ? (
            <Section title="Packages" error={errPackages}>
              {packageNodes.length === 0 && !errPackages ? (
                <Typography variant="body2" color="text.secondary">
                  No matching packages.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {packageNodes.map((n) => gridItem(n))}
                </Grid>
              )}
            </Section>
          ) : null}
        </Stack>
      )}
    </Container>
  );
}
