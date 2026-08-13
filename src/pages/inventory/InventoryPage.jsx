import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import TuneIcon from "@mui/icons-material/Tune";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InventoryIcon from "@mui/icons-material/Inventory";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";
import { formatKyats } from "../../utils/formatKyats";
import {
  getProducts,
  getCategories,
  getProductUnits,
  getProductTypes,
  getInventoryAlerts,
} from "./inventoryService";
import NewProductDialog from "../../components/inventory/NewProductDialog";

function stockStatusChipColor(status) {
  if (status === "out") return "error";
  if (status === "low") return "warning";
  return "success";
}

function stockStatusLabel(status) {
  if (status === "out") return "Out";
  if (status === "low") return "Low Stock";
  return "In Stock";
}

function formatNearestExpiryDate(value) {
  return value ? dayjs(value).format("DD MMM YYYY") : "—";
}

const INVENTORY_GUIDE_STORAGE_KEY =
  "dermafairy_inventory_guide_dismiss_permanent";
const INVENTORY_GUIDE_LANG_KEY = "dermafairy_inventory_guide_lang";
function readGuidePermanentlyDismissed() {
  try {
    return localStorage.getItem(INVENTORY_GUIDE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readGuideLang() {
  try {
    const v = localStorage.getItem(INVENTORY_GUIDE_LANG_KEY);
    if (v === "en" || v === "my") return v;
  } catch {
    /* ignore */
  }
  return "my";
}

/** Technical terms (inventory, stock, batch, …) stay in English per clinic convention. */
const GUIDE_I18N = {
  my: {
    title: "Inventory အသုံးပြုပုံ",
    subtitle:
      "Stock、batches နှင့် Purchase များ အတွက် လမ်းညွှန်ချက်။ ငွေပမာဏအားလုံးကို Myanmar Kyats (K) ဖြင့် ပြသထားပါသည်။",
    bullets: [
      "Search နှင့် filters သုံးပြီး product များကို name၊ SKU၊ category နှင့် stock status (All / Low / Out) ဖြင့် ရှာဖွေရွေးချယ်နိုင်ပါသည်။",
      "Product တစ်ခုကို ဖွင့်လိုက်ပါက batches (expiry နှင့် cost ကို K ဖြင့်)、movement history ကို ကြည့်ရှုနိုင်ပြီး ခွင့်ပြုချက်ရှိလျှင် stock in၊ stock out သို့မဟုတ် adjustment များ မှတ်တမ်းတင်နိုင်ပါသည်။",
      "Product အသစ်ထည့်သည့်အခါ သို့မဟုတ် ပြင်ဆင်သည့်အခါ minimum stock level သတ်မှတ်ပါ။ လက်ရှိ stock ပမာဏကို batch များ ပေါင်းစည်းမှု ဖြင့် တွက်ချက်ပြီး product တွင် တိုက်ရိုက် သိမ်းဆည်းထားခြင်း မရှိပါ။",
      "Inventory စီမံခွင့်ရှိသူများသည် Purchase Orders မှတစ်ဆင့် incoming stock မှတ်တမ်းတင်နိုင်သည်။ received ဖြစ်သောအခါ batches နှင့် audit movement များကို စနစ်က အလိုအလျောက် ဖန်တီးပေးပါသည်။",
      "Table အထက်ရှိ alert များတွင် expired batches၊ မကြာမီ သက်တမ်းကုန်မည့် အချက်များ၊ နှင့် minimum level အောက် (သို့) ညီမျှသော product များ ပါဝင်ပါသည်။",
    ],
    dontShowAgain: "ထပ်မပြပါနှင့်",
    close: "ပိတ်ရန်",
    ariaClose: "လမ်းညွှန်ချက် ပိတ်ရန်",
    toggleMy: "မြန်မာ",
    toggleEn: "English",
  },
  en: {
    title: "How to use inventory",
    subtitle:
      "Quick reference for browsing stock, batches, and purchases. All monetary amounts are shown in Myanmar Kyats (K).",
    bullets: [
      "Use search and filters to find products by name, SKU, category, or stock status (All / Low / Out).",
      "Open a product to view batches (with expiry dates and cost in K), movement history, and—if you have permission—to record stock in, stock out, or adjustments.",
      "Set each product’s minimum stock level when adding or editing items; on-hand quantity is always derived from batches, not stored on the product itself.",
      "If you can manage inventory, record incoming stock via Purchase Orders; received purchases create batches and audit movements automatically.",
      "Review the alert banners above the table for expired batches, upcoming expiries, and products at or below their minimum level.",
    ],
    dontShowAgain: "Don't show again",
    close: "Close",
    ariaClose: "Close guide",
    toggleMy: "မြန်မာ",
    toggleEn: "English",
  },
};

export default function InventoryPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canManage = hasPermission(user, "inventory.manage");

  const [guideOpen, setGuideOpen] = useState(
    () => !readGuidePermanentlyDismissed(),
  );
  const [dontShowGuideAgain, setDontShowGuideAgain] = useState(false);
  const [guideLang, setGuideLang] = useState(readGuideLang);

  const setGuideLanguage = (lang) => {
    setGuideLang(lang);
    try {
      localStorage.setItem(INVENTORY_GUIDE_LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  };

  const g = GUIDE_I18N[guideLang];

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alerts, setAlerts] = useState({
    low_stock: [],
    expiring_soon: [],
    expired: [],
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [prods, cats, unitOptions, typeOptions] = await Promise.all([
        getProducts(),
        getCategories(),
        getProductUnits(),
        getProductTypes(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setUnits(unitOptions);
      setTypes(typeOptions);
      try {
        setAlerts(await getInventoryAlerts({ days: 90 }));
      } catch {
        setAlerts({ low_stock: [], expiring_soon: [], expired: [] });
      }
    } catch {
      setError("Could not load inventory data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = products.filter((p) => {
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !p.sku?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (categoryFilter && String(p.category_id) !== String(categoryFilter))
      return false;
    if (stockFilter === "low" && p.stock_status !== "low") return false;
    if (stockFilter === "out" && p.stock_status !== "out") return false;
    return true;
  });

  const lowCount = products.filter((p) => p.stock_status === "low").length;
  const outCount = products.filter((p) => p.stock_status === "out").length;

  const closeInventoryGuide = () => {
    if (dontShowGuideAgain) {
      try {
        localStorage.setItem(INVENTORY_GUIDE_STORAGE_KEY, "1");
      } catch {
        /* private mode / quota */
      }
    }
    setGuideOpen(false);
  };

  return (
    <Box>
      <Collapse in={guideOpen}>
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
                    {g.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.25 }}
                  >
                    {g.subtitle}
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
                  <ToggleButton
                    value="my"
                    sx={{ px: 1.25, textTransform: "none" }}
                  >
                    {g.toggleMy}
                  </ToggleButton>
                  <ToggleButton
                    value="en"
                    sx={{ px: 1.25, textTransform: "none" }}
                  >
                    {g.toggleEn}
                  </ToggleButton>
                </ToggleButtonGroup>
                <IconButton
                  size="small"
                  onClick={closeInventoryGuide}
                  aria-label={g.ariaClose}
                  sx={{ color: "text.secondary" }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            <List dense disablePadding sx={{ py: 0 }}>
              {g.bullets.map((text, idx) => (
                <ListItem
                  key={`${guideLang}-${idx}`}
                  alignItems="flex-start"
                  sx={{ py: 0.5, px: 0 }}
                >
                  <ListItemIcon sx={{ minWidth: 32, mt: 0.35 }}>
                    <CheckCircleOutlineIcon
                      fontSize="small"
                      sx={{ color: "info.main" }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={text}
                    primaryTypographyProps={{
                      variant: "body2",
                      color: "text.primary",
                      sx: { lineHeight: 1.55 },
                    }}
                  />
                </ListItem>
              ))}
            </List>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
              spacing={1.5}
              sx={{ pt: 0.5 }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={dontShowGuideAgain}
                    onChange={(_, checked) => setDontShowGuideAgain(checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    {g.dontShowAgain}
                  </Typography>
                }
              />
              <Button
                variant="contained"
                color="primary"
                onClick={closeInventoryGuide}
              >
                {g.close}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Collapse>

      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Inventory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage products, batches and stock levels
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          {canManage && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate("/purchases")}
            >
              Purchase Orders
            </Button>
          )}
          {canManage && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
            >
              Add Product
            </Button>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {alerts.expired?.length > 0 && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          <strong>{alerts.expired.length}</strong> batch
          {alerts.expired.length > 1 ? "es have" : " has"} expired stock still
          on hand — review batches and dispose or adjust.
        </Alert>
      )}
      {alerts.expiring_soon?.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          <strong>{alerts.expiring_soon.length}</strong> batch
          {alerts.expiring_soon.length > 1 ? "es" : ""} expiring within 90 days.
        </Alert>
      )}
      {(lowCount > 0 || outCount > 0) && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          {outCount > 0 && (
            <>
              <strong>{outCount}</strong> product{outCount > 1 ? "s" : ""} are
              out of stock.{" "}
            </>
          )}
          {lowCount > 0 && (
            <>
              <strong>{lowCount}</strong> product{lowCount > 1 ? "s" : ""} are
              running low (at or below minimum).
            </>
          )}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        mb={2.5}
        flexWrap="wrap"
        useFlexGap
      >
        <TextField
          placeholder="Search by name or SKU…"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 260 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            label="Category"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <ToggleButtonGroup
          value={stockFilter}
          exclusive
          onChange={(_, v) => v && setStockFilter(v)}
          size="small"
          sx={{
            height: 40,
            "& .MuiToggleButton-root": {
              textTransform: "none",
              fontWeight: 600,
            },
          }}
        >
          <ToggleButton
            value="all"
            sx={{
              "&.Mui-selected": {
                bgcolor: alpha(theme.palette.primary.main, 0.2),
                color: "primary.main",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.28),
                },
              },
            }}
          >
            All
          </ToggleButton>
          <ToggleButton
            value="low"
            sx={{
              "&.Mui-selected": {
                bgcolor: alpha(theme.palette.warning.main, 0.22),
                color: theme.palette.warning.main,
                "&:hover": {
                  bgcolor: alpha(theme.palette.warning.main, 0.3),
                },
              },
            }}
          >
            Low Stock
          </ToggleButton>
          <ToggleButton
            value="out"
            sx={{
              "&.Mui-selected": {
                bgcolor: alpha(theme.palette.error.main, 0.18),
                color: theme.palette.error.main,
                "&:hover": {
                  bgcolor: alpha(theme.palette.error.main, 0.26),
                },
              },
            }}
          >
            Out
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 10, color: "text.secondary" }}>
          <InventoryIcon
            sx={{
              fontSize: 56,
              mb: 1,
              color: "action.disabled",
              opacity: theme.palette.mode === "dark" ? 0.35 : 0.5,
            }}
          />
          <Typography variant="h6" color="text.primary">
            No products found
          </Typography>
          {canManage && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Click <strong>Add Product</strong> to create your first inventory
              item.
            </Typography>
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nearest Expiry</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Selling Price
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Stock
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((product) => {
                const chipColor = stockStatusChipColor(product.stock_status);
                return (
                  <TableRow
                    key={product.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`/inventory/${product.id}`)}
                  >
                    <TableCell>
                      <Typography fontWeight={600} color="text.primary">
                        {product.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatNearestExpiryDate(product.nearest_expiry_date)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {formatKyats(product.selling_price)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700} color="text.primary">
                        {product.total_stock}{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {product.unit}
                        </Typography>
                      </Typography>
                      {product.min_stock_level > 0 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          min: {product.min_stock_level}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={stockStatusLabel(product.stock_status)}
                        color={chipColor}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <NewProductDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        categories={categories}
        units={units}
        types={types}
        onUnitsUpdated={setUnits}
        onCategoriesUpdated={setCategories}
        onTypesUpdated={setTypes}
        onSuccess={() => load()}
        onSaveError={(msg) => setError(msg)}
      />
    </Box>
  );
}
