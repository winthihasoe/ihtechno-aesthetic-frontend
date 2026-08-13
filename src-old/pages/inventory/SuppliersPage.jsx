import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";
import { resolveUserPrimaryRole } from "../../utils/workspaceRoutes";
import {
  getSuppliers,
  deleteSupplier,
} from "./inventoryService";
import SupplierFormDialog from "../../components/inventory/SupplierFormDialog";

const EMPTY_STEPS = [
  {
    icon: StorefrontOutlinedIcon,
    title: "Add a supplier",
    body: "Record name, phone, email, and address — or create one inline when you record inventory receiving.",
  },
  {
    icon: LocalShippingOutlinedIcon,
    title: "Link to receiving",
    body: "Pick the supplier on each purchase so batch costs, consignment stock, and payables stay tied to the right vendor.",
  },
  {
    icon: PaymentsOutlinedIcon,
    title: "Finance follow-through",
    body: "Supplier payables, consignment settlement, and returns all reference this directory for audit and payment.",
  },
];

const emptyForm = () => ({
  name: "",
  phone: "",
  email: "",
  address: "",
});

export default function SuppliersPage() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const canManage = hasPermission(user, "inventory.manage");
  const purchasesPath = `/${resolveUserPrimaryRole(user)}/purchases`;

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [editInitialValues, setEditInitialValues] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setSuppliers(await getSuppliers());
    } catch {
      setError("Could not load suppliers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setEditInitialValues(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setFormMode("edit");
    setEditingId(row.id);
    setEditInitialValues({
      name: row.name ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      address: row.address ?? "",
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSupplier(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(e?.response?.data?.message ?? "Could not delete supplier.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const truncate = (s, n = 48) => {
    if (!s) return "—";
    return s.length <= n ? s : `${s.slice(0, n)}…`;
  };

  return (
    <Box>
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
            Suppliers
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
          >
            Vendors for purchase orders and stock receipts
          </Typography>
        </Box>
        {canManage && suppliers.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={openCreate}
          >
            Add supplier
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : suppliers.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: alpha(
              theme.palette.primary.main,
              theme.palette.mode === "dark" ? 0.06 : 0.04,
            ),
          }}
        >
          <Box
            sx={{
              textAlign: "center",
              py: { xs: 5, sm: 7 },
              px: { xs: 2.5, sm: 4 },
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
                bgcolor: alpha(
                  theme.palette.primary.main,
                  theme.palette.mode === "dark" ? 0.2 : 0.12,
                ),
              }}
            >
              <BusinessOutlinedIcon
                sx={{ fontSize: 36, color: "primary.main" }}
              />
            </Box>
            <Typography
              variant="h6"
              fontWeight={700}
              color="text.primary"
              gutterBottom
            >
              No suppliers yet
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 520, mx: "auto", lineHeight: 1.65 }}
            >
              Suppliers are the vendor directory for inventory receiving,
              consignment tracking, and finance payables — add your first one
              to start linking purchases.
            </Typography>
            {canManage && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreate}
                sx={{ mt: 2.5 }}
              >
                Add first supplier
              </Button>
            )}
          </Box>

          <Box sx={{ px: { xs: 2.5, sm: 4 }, pb: { xs: 4, sm: 5 }, pt: 1 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ maxWidth: 960, mx: "auto" }}
            >
              {EMPTY_STEPS.map(({ icon: Icon, title, body }) => (
                <Paper
                  key={title}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    textAlign: "left",
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{ mt: 0.25, color: "primary.main", display: "flex" }}
                    >
                      <Icon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        gutterBottom
                      >
                        {title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        lineHeight={1.6}
                      >
                        {body}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 3, textAlign: "center" }}
            >
              {canManage ? (
                <>
                  You can also add a supplier while recording stock under{" "}
                  <Typography
                    component={RouterLink}
                    to={purchasesPath}
                    variant="body2"
                    sx={{
                      color: "primary.main",
                      fontWeight: 600,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Inventory → Inventory Receiving
                  </Typography>
                  .
                </>
              ) : (
                "Suppliers are added by staff with inventory manage access, or inline when recording a purchase."
              )}
            </Typography>
          </Box>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Purchases
                </TableCell>
                {canManage && <TableCell align="right" />}
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Typography fontWeight={600} color="text.primary">
                      {s.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {s.phone ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {s.email ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {truncate(s.address, 40)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600} color="text.primary">
                      {s.purchases_count ?? 0}
                    </Typography>
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                      >
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openEdit(s)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <SupplierFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        supplierId={editingId}
        initialValues={editInitialValues}
        onSaved={() => load()}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }} color="text.primary">
          Delete supplier?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <strong>{deleteTarget?.name}</strong> will be removed. Existing
            purchase orders will keep their history; the supplier link may
            become empty.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
