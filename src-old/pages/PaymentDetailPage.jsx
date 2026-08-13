/**
 * Invoice detail page (edit, pay, print).
 *
 * PRINT SIZE (required): All invoice/receipt output uses A5 portrait.
 * See PaymentDetailPrintStyles.jsx (`@page { size: A5 portrait }`) — do not switch to A4/Letter.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../components/common/LoadingIndicator";
import AddIcon from "@mui/icons-material/Add";
import {
  createInvoiceDraft,
  generatePaymentDraft,
  getPaymentById,
  updatePayment,
  addPaymentTransaction,
  voidPayment,
} from "../services/paymentService";
import { getTransactionMethods } from "../services/transactionMethodService";
import { getProductPickerOptions } from "../services/productPickerService";
import {
  getPackages,
  getVisitPatientPackageItems,
  postVisitPackageUsage,
} from "../services/packageService";
import {
  applyStoreCreditToPayment,
  getPatientStoreCredit,
} from "../services/storeCreditService";
import { getPatients } from "../services/patientService";
import { getActiveTreatmentTemplates } from "../services/treatmentTemplateService";
import { resolveApiError } from "../services/apiClient";
import useToastStore from "../stores/toastStore";
import useAuthStore from "../stores/authStore";
import useConfirmStore from "../stores/confirmStore";
import { hasPermission } from "../utils/accessUtils";
import { groupedTransactionMethodsForSelect } from "../utils/financialLedgerKindUtils";
import { canDo } from "../utils/roleUtils";
import useSettingsStore from "../stores/settingsStore";
import {
  computeLineTotal,
  migrateConsultationLegacyDiscount,
  resolveInvoiceSalesPersonName,
} from "../utils/invoiceReceiptUtils";
import { parseCommaAmount } from "../utils/amountInputUtils";
import {
  CUSTOM_PACKAGE_HEAD,
  CUSTOM_TREATMENT_HEAD,
  CATALOG_LABEL_TYPES,
  DISCOUNT_TYPE_OPTIONS,
} from "../utils/paymentDetailConstants";
import {
  applyOrderDiscountToTotals,
  applyVatToTotals,
  computeTotalsFromLines,
  isDraftRefreshablePaymentStatus,
  isInvoiceTerminalStatus,
  isInvoicePreviewOpenStatus,
  lineDefaultLabelByType,
  normalizeOrderDiscount,
  normalizePaymentLines,
  invoiceAmountDueBeforeNextPayment,
  previewRemainingAfterPartialPayment,
  resolveEffectiveVatPercent,
  resolvePaymentCollectionAmount,
  resolvePaymentCustomerName,
} from "../utils/paymentDetailUtils";
import PaymentDetailPrintStyles from "../components/paymentDetail/PaymentDetailPrintStyles.jsx";
import { PaymentInvoiceLinesEditor } from "../components/paymentDetail/PaymentInvoiceLinesEditor.jsx";
import { PaymentDetailInvoicePreviewDialog } from "../components/paymentDetail/PaymentDetailInvoicePreviewDialog.jsx";
import dayjs from "dayjs";
import {
  InvoiceReceiptHeader,
  InvoiceReceiptLineTable,
  InvoiceReceiptPaymentMeta,
  InvoiceReceiptPaymentSummaryRows,
  InvoiceReceiptThankYouFooter,
  InvoiceReceiptTotalsFooter,
} from "../components/invoiceReceipt/InvoiceReceiptBlocks.jsx";
import {
  getInvoicesListPath,
  getInvoiceDetailPath,
  getWorkspaceUrlPrefix,
} from "../utils/workspaceRoutes";

export {
  isDraftRefreshablePaymentStatus,
  isInvoiceTerminalStatus,
  isPayablePaymentStatus,
} from "../utils/paymentDetailUtils";

export default function PaymentDetailPage() {
  const navigate = useNavigate();
  const { paymentId } = useParams();
  const isNewInvoiceMode = String(paymentId || "").toLowerCase() === "new";
  const { pushToast } = useToastStore();
  const { user } = useAuthStore();
  const workspacePrefix = getWorkspaceUrlPrefix(user);
  const { askConfirm } = useConfirmStore();
  const { settings, fetchSettings } = useSettingsStore();
  const [payment, setPayment] = useState(null);
  const [lines, setLines] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [makingPayment, setMakingPayment] = useState(false);
  const [voidingInvoice, setVoidingInvoice] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [packageOptions, setPackageOptions] = useState([]);
  const [treatmentOptions, setTreatmentOptions] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState({
    type: "none",
    value: 0,
  });
  const [selectedPatientPackageItemId, setSelectedPatientPackageItemId] =
    useState("");
  const [availablePatientPackageItems, setAvailablePatientPackageItems] =
    useState([]);
  const [applyingPatientPackage, setApplyingPatientPackage] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [transactionMethods, setTransactionMethods] = useState([]);
  const [selectedTransactionMethodId, setSelectedTransactionMethodId] =
    useState(null);
  const [paymentCollectionMode, setPaymentCollectionMode] = useState("full");
  const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
  const [partialDueDate, setPartialDueDate] = useState("");
  const [storeCreditBalance, setStoreCreditBalance] = useState(0);
  const [storeCreditApplyAmount, setStoreCreditApplyAmount] = useState("");
  const [applyingStoreCredit, setApplyingStoreCredit] = useState(false);

  const canEditPayments = hasPermission(user, "payments.manage");
  const canApplyStoreCredit = hasPermission(user, "patient.store_credit.apply");
  const canViewStoreCredit = hasPermission(user, "patient.store_credit.view");
  const canCompletePayment = canDo(user?.role, "complete_payment");
  const currentRole =
    user?.role ||
    (Array.isArray(user?.roles) && user.roles.length
      ? (user.roles[0]?.slug ?? user.roles[0]?.name)
      : null);
  const normalizedRole = String(currentRole || "").toLowerCase();
  const canSellPackagesAndDiscounts =
    canEditPayments ||
    ["reception", "sales_marketing", "admin", "owner"].includes(normalizedRole);

  const lineTotals = useMemo(() => computeTotalsFromLines(lines), [lines]);
  const effectiveVatPercent = useMemo(
    () => resolveEffectiveVatPercent(payment, settings),
    [payment, settings],
  );
  const totalsAfterOrderDiscount = useMemo(
    () => applyOrderDiscountToTotals(lineTotals, orderDiscount),
    [lineTotals, orderDiscount],
  );
  const totals = useMemo(
    () => applyVatToTotals(totalsAfterOrderDiscount, effectiveVatPercent),
    [totalsAfterOrderDiscount, effectiveVatPercent],
  );
  const customerDisplayName = useMemo(
    () => resolvePaymentCustomerName(payment, customerName) || "—",
    [customerName, payment],
  );
  const salesPersonName = useMemo(
    () => resolveInvoiceSalesPersonName(payment),
    [payment],
  );
  const prescriptionInvoiceReminders = useMemo(() => {
    const reminders = payment?.items?.prescription_invoice_reminders;
    return Array.isArray(reminders) ? reminders : [];
  }, [payment?.items?.prescription_invoice_reminders]);
  const hasDraftChanges = useMemo(() => {
    if (!payment) return isNewInvoiceMode;
    const currentLines = JSON.stringify(lines);
    const originalLines = JSON.stringify(normalizePaymentLines(payment?.items));
    const currentOrderDiscount = JSON.stringify(orderDiscount);
    const originalOrderDiscount = JSON.stringify(
      normalizeOrderDiscount(payment?.items),
    );
    return (
      currentLines !== originalLines ||
      currentOrderDiscount !== originalOrderDiscount ||
      (notes || "") !== (payment?.notes || "")
    );
  }, [isNewInvoiceMode, lines, notes, orderDiscount, payment]);

  const hasUnsavedNavigateRisk = useMemo(() => {
    if (isNewInvoiceMode) {
      return (
        lines.length > 0 ||
        String(customerName || "").trim() !== "" ||
        String(customerPhone || "").trim() !== "" ||
        String(notes || "").trim() !== "" ||
        orderDiscount.type !== "none" ||
        Number(orderDiscount.value || 0) > 0
      );
    }
    return hasDraftChanges;
  }, [
    isNewInvoiceMode,
    hasDraftChanges,
    lines.length,
    customerName,
    customerPhone,
    notes,
    orderDiscount.type,
    orderDiscount.value,
  ]);

  const handleBackClick = useCallback(async () => {
    if (hasUnsavedNavigateRisk) {
      const ok = await askConfirm({
        title: "Unsaved changes",
        message:
          "You have unsaved changes on this invoice. Leave without saving? Your edits will be lost.",
        confirmText: "Leave without saving",
        cancelText: "Stay",
      });
      if (!ok) return;
    }
    navigate(getInvoicesListPath(workspacePrefix));
  }, [askConfirm, hasUnsavedNavigateRisk, navigate, workspacePrefix]);

  const packagePickerOptions = useMemo(
    () => [CUSTOM_PACKAGE_HEAD, ...packageOptions],
    [packageOptions],
  );
  const treatmentPickerOptions = useMemo(
    () => [CUSTOM_TREATMENT_HEAD, ...treatmentOptions],
    [treatmentOptions],
  );

  const walkInOption = useMemo(
    () => ({ id: "walk-in", name: "Walk-in customer", phone: "" }),
    [],
  );

  const load = async () => {
    if (!paymentId) return;
    setLoading(true);
    setError("");
    try {
      const productsPromise = getProductPickerOptions();
      let loadedPaymentData = null;
      const packagesData = await getPackages({ active_only: true }).catch(
        () => [],
      );
      const templatesData = await getActiveTreatmentTemplates().catch(() => []);
      if (isNewInvoiceMode) {
        setPayment(null);
        setLines([]);
        setOrderDiscount({ type: "none", value: 0 });
        setNotes("");
      } else {
        const paymentData = await getPaymentById(paymentId);
        loadedPaymentData = paymentData;
        setPayment(paymentData);
        setLines(normalizePaymentLines(paymentData?.items));
        setOrderDiscount(normalizeOrderDiscount(paymentData?.items));
        setNotes(paymentData?.notes || "");
        setCustomerName(resolvePaymentCustomerName(paymentData));
        setCustomerPhone(paymentData?.customer_phone || "");
        setPartialPaymentAmount("");
      }
      const productsData = await productsPromise;
      setProductOptions(Array.isArray(productsData) ? productsData : []);
      setPackageOptions(Array.isArray(packagesData) ? packagesData : []);
      setTreatmentOptions(Array.isArray(templatesData) ? templatesData : []);
      if (!isNewInvoiceMode && loadedPaymentData?.visit_id) {
        const patientPackageItems = await getVisitPatientPackageItems(
          loadedPaymentData.visit_id,
        ).catch(() => []);
        setAvailablePatientPackageItems(
          Array.isArray(patientPackageItems) ? patientPackageItems : [],
        );
      } else {
        setAvailablePatientPackageItems([]);
      }
      await fetchSettings();
    } catch (err) {
      setError(resolveApiError(err, "Could not load payment detail."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewInvoiceMode, paymentId]);

  useEffect(() => {
    if (!isNewInvoiceMode) return;
    const trimmed = customerQuery.trim();
    if (trimmed.length < 1) {
      setCustomerOptions([walkInOption]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setCustomerSearchLoading(true);
        const response = await getPatients({ search: trimmed, per_page: 10 });
        const rows = Array.isArray(response?.data) ? response.data : [];
        setCustomerOptions([walkInOption, ...rows]);
      } catch {
        setCustomerOptions([walkInOption]);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerQuery, isNewInvoiceMode, walkInOption]);

  useEffect(() => {
    getTransactionMethods()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setTransactionMethods(list);
        setSelectedTransactionMethodId((prev) => {
          if (prev != null) return prev;
          const active = list.filter((m) => m.status === "active");
          return active.find((m) => m.is_default)?.id ?? active[0]?.id ?? null;
        });
      })
      .catch(() => setTransactionMethods([]));
  }, []);

  useEffect(() => {
    if (payment?.due_date) {
      setPartialDueDate(dayjs(payment.due_date).format("YYYY-MM-DD"));
    } else if (payment?.id) {
      setPartialDueDate("");
    }
  }, [payment?.id, payment?.due_date]);

  useEffect(() => {
    if (payment?.transaction_method_id) {
      setSelectedTransactionMethodId(payment.transaction_method_id);
    }
  }, [payment?.id, payment?.transaction_method_id]);

  useEffect(() => {
    const patientId = payment?.patient_id ?? selectedCustomer?.id;
    if (!canViewStoreCredit || !patientId || patientId === "walk-in") {
      setStoreCreditBalance(0);
      return;
    }
    getPatientStoreCredit(patientId)
      .then((data) => setStoreCreditBalance(Number(data?.balance || 0)))
      .catch(() => setStoreCreditBalance(0));
  }, [payment?.patient_id, selectedCustomer?.id, canViewStoreCredit]);

  useEffect(() => {
    const due = Number(payment?.balance ?? totals?.grand ?? 0);
    if (storeCreditBalance > 0 && due > 0) {
      setStoreCreditApplyAmount(String(Math.min(storeCreditBalance, due)));
    }
  }, [payment?.balance, storeCreditBalance, totals?.grand]);

  const handleApplyStoreCredit = async () => {
    if (!payment?.id) return;
    const amount = Number(storeCreditApplyAmount || 0);
    if (amount <= 0) return;
    setApplyingStoreCredit(true);
    try {
      const result = await applyStoreCreditToPayment(payment.id, amount);
      setPayment(result.invoice || result.payment || payment);
      setStoreCreditBalance(Number(result.balance ?? 0));
      pushToast({ message: "Store credit applied.", severity: "success" });
      await load();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not apply store credit."),
        severity: "error",
      });
    } finally {
      setApplyingStoreCredit(false);
    }
  };

  const setLineValue = (index, patch) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        next.line_total = computeLineTotal(next);
        return next;
      }),
    );
  };

  const handleLineTypeChange = (index, type) => {
    const safeType = type || "other";
    const patch = {
      type: safeType,
    };
    if (CATALOG_LABEL_TYPES.has(safeType)) {
      patch.label = "";
      patch.meta = {};
    } else {
      patch.label = lineDefaultLabelByType(safeType);
      patch.meta = undefined;
    }
    setLineValue(index, patch);
  };

  const handleLabelBlur = (index) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const lt = line.type || "other";
        if (CATALOG_LABEL_TYPES.has(lt)) {
          return line;
        }
        if (String(line.label ?? "").trim() !== "") return line;
        return { ...line, label: lineDefaultLabelByType(line.type) };
      }),
    );
  };

  const handlePriceBlur = (index) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const qty = Number(line.qty || 0);
        const parsed = parseCommaAmount(line.unit_price);
        const unitPrice = Number.isFinite(parsed) ? parsed : 0;
        return {
          ...line,
          qty,
          unit_price: unitPrice,
          line_total: computeLineTotal({ ...line, qty, unit_price: unitPrice }),
        };
      }),
    );
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        type: "other",
        label: "",
        qty: 1,
        unit_price: 0,
        line_total: 0,
        discount_type: "none",
        discount_value: 0,
        meta: {},
      },
    ]);
  };

  const handleRemoveLine = async (index) => {
    const line = lines[index];
    const ok = await askConfirm({
      title: "Delete invoice item?",
      message: `Remove "${line?.label || "this item"}" from the invoice?`,
      confirmText: "Delete item",
      cancelText: "Cancel",
    });
    if (!ok) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyPatientPackageByCashier = async () => {
    if (!payment?.visit_id || !selectedPatientPackageItemId) return;
    try {
      setApplyingPatientPackage(true);
      const usage = await postVisitPackageUsage(payment.visit_id, {
        patient_package_item_id: Number(selectedPatientPackageItemId),
        used_sessions: 1,
      });
      const refreshed = await generatePaymentDraft(payment.visit_id);
      const usageId = usage?.id;
      let nextLines = normalizePaymentLines(refreshed?.items);
      if (usageId) {
        nextLines = nextLines.map((line) => {
          if (
            line?.type === "package_discount" &&
            Number(line?.meta?.package_usage_id) === Number(usageId)
          ) {
            return {
              ...line,
              label: `${line.label || "Package coverage"} (Applied by cashier)`,
              meta: {
                ...(line.meta || {}),
                cashier_applied: true,
              },
            };
          }
          return line;
        });
        refreshed.items = {
          ...(refreshed.items || {}),
          lines: nextLines,
        };
        const saved = await updatePayment(refreshed.id, {
          items: refreshed.items,
          amount: refreshed.amount,
          notes: refreshed.notes || notes,
        });
        refreshed.items = saved?.items || refreshed.items;
      }
      setPayment(refreshed);
      setLines(nextLines);
      setOrderDiscount(normalizeOrderDiscount(refreshed?.items));
      setSelectedPatientPackageItemId("");
      pushToast({
        message: "Patient package applied by cashier.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not apply patient package."),
        severity: "error",
      });
    } finally {
      setApplyingPatientPackage(false);
    }
  };

  const buildDraftPayload = (statusOverride) => {
    const cleanedLines = lines.map((line) => {
      const type = line.type || "other";
      let qty = Number(line.qty ?? 1);
      if (qty <= 0) qty = 1;
      const parsed = parseCommaAmount(line.unit_price);
      const unitPrice = Number.isFinite(parsed) ? parsed : 0;
      let normalizedLine = {
        ...line,
        type,
        label: CATALOG_LABEL_TYPES.has(type)
          ? String(line.label ?? "").trim()
          : String(line.label || lineDefaultLabelByType(type)),
        qty,
        unit_price: unitPrice,
        discount_type: line.discount_type || "none",
        discount_value: Number(line.discount_value || 0),
        meta: line.meta || {},
      };
      if (type === "consultation") {
        normalizedLine = migrateConsultationLegacyDiscount(normalizedLine);
      }
      return {
        ...normalizedLine,
        line_total: computeLineTotal(normalizedLine),
      };
    });
    const totalsPreVat = applyOrderDiscountToTotals(
      computeTotalsFromLines(cleanedLines),
      orderDiscount,
    );
    const payload = {
      items: {
        lines: cleanedLines,
        order_discount: orderDiscount,
        totals: totalsPreVat,
        prescription_invoice_reminders: prescriptionInvoiceReminders,
      },
      amount: totalsPreVat.grand,
      notes,
      customer_name: customerName.trim() || null,
      customer_phone: customerPhone.trim() || null,
      patient_id:
        selectedCustomer && selectedCustomer.id !== "walk-in"
          ? selectedCustomer.id
          : (payment?.patient_id ?? null),
    };
    if (statusOverride !== undefined) {
      if (statusOverride !== null) payload.status = statusOverride;
    } else if (isNewInvoiceMode) {
      payload.status = "draft";
    }
    return payload;
  };

  const handleGenerateInvoice = async () => {
    if (isNewInvoiceMode && !customerName.trim()) {
      pushToast({
        message: "Customer name is required.",
        severity: "warning",
      });
      return;
    }
    if (isNewInvoiceMode) {
      const ok = await askConfirm({
        title: "Save draft invoice?",
        message:
          "This new invoice is not saved yet. Save it as a draft invoice now?",
        confirmText: "Save Draft",
        cancelText: "Cancel",
      });
      if (!ok) return;
    }

    const stNow = String(payment?.status || "").toLowerCase();
    const previewOnly = !isNewInvoiceMode && isInvoicePreviewOpenStatus(stNow);

    if (previewOnly) {
      const openPreviewWhenDone = !hasDraftChanges;
      if (stNow === "paid" && openPreviewWhenDone) {
        try {
          setDrafting(true);
          const refreshed = await getPaymentById(payment.id);
          setPayment(refreshed);
          setLines(normalizePaymentLines(refreshed?.items));
          setOrderDiscount(normalizeOrderDiscount(refreshed?.items));
          setNotes(refreshed?.notes || "");
          setCustomerName(resolvePaymentCustomerName(refreshed));
          setCustomerPhone(refreshed?.customer_phone || "");
          setOpenPreview(true);
          pushToast({
            message: "Invoice preview opened.",
            severity: "success",
          });
        } catch (err) {
          pushToast({
            message: resolveApiError(err, "Unable to open invoice preview."),
            severity: "error",
          });
        } finally {
          setDrafting(false);
        }
        return;
      }
      try {
        setDrafting(true);
        let updated = payment;
        if (payment?.visit_id) {
          updated = await generatePaymentDraft(payment.visit_id);
          if (hasDraftChanges) {
            updated = await updatePayment(updated.id, buildDraftPayload(null));
          }
        } else if (hasDraftChanges) {
          updated = await updatePayment(payment.id, buildDraftPayload(null));
        }
        setPayment(updated);
        setLines(normalizePaymentLines(updated?.items));
        setOrderDiscount(normalizeOrderDiscount(updated?.items));
        setNotes(updated?.notes || "");
        setCustomerName(resolvePaymentCustomerName(updated));
        setCustomerPhone(updated?.customer_phone || "");
        if (openPreviewWhenDone) {
          setOpenPreview(true);
        }
        pushToast({
          message: openPreviewWhenDone
            ? "Invoice preview opened."
            : "Invoice saved.",
          severity: "success",
        });
      } catch (err) {
        pushToast({
          message: resolveApiError(
            err,
            openPreviewWhenDone
              ? "Unable to open invoice preview."
              : "Unable to save invoice.",
          ),
          severity: "error",
        });
      } finally {
        setDrafting(false);
      }
      return;
    }

    try {
      setDrafting(true);
      let updated;
      if (isNewInvoiceMode) {
        updated = await createInvoiceDraft(buildDraftPayload());
        navigate(getInvoiceDetailPath(workspacePrefix, updated.id), {
          replace: true,
        });
      } else if (payment?.visit_id) {
        updated = await generatePaymentDraft(payment.visit_id);
        const afterGen = String(updated?.status || "").toLowerCase();
        const needIssue =
          stNow === "draft" || afterGen === "draft" || !updated?.invoice_number;
        if (hasDraftChanges) {
          updated = await updatePayment(
            updated.id,
            buildDraftPayload(needIssue ? "issued" : null),
          );
        } else if (needIssue) {
          updated = await updatePayment(updated.id, { status: "issued" });
        }
      } else {
        const needIssue = stNow === "draft";
        updated = await updatePayment(
          payment.id,
          buildDraftPayload(needIssue ? "issued" : null),
        );
      }
      setPayment(updated);
      setLines(normalizePaymentLines(updated?.items));
      setOrderDiscount(normalizeOrderDiscount(updated?.items));
      setNotes(updated?.notes || "");
      setCustomerName(resolvePaymentCustomerName(updated));
      setCustomerPhone(updated?.customer_phone || "");
      if (!isNewInvoiceMode) {
        setOpenPreview(true);
      }
      const becameIssued =
        !isNewInvoiceMode &&
        stNow === "draft" &&
        String(updated?.status || "").toLowerCase() === "issued";
      pushToast({
        message: isNewInvoiceMode
          ? "Draft invoice saved."
          : becameIssued
            ? "Invoice issued."
            : "Invoice saved.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Unable to generate invoice."),
        severity: "error",
      });
    } finally {
      setDrafting(false);
    }
  };

  const handleMakePaymentAndPrint = async () => {
    if (!canCompletePayment) return;
    if (!isNewInvoiceMode && !payment) return;
    if (!selectedTransactionMethodId) {
      pushToast({
        message: "Select Receive Via.",
        severity: "warning",
      });
      return;
    }
    try {
      setMakingPayment(true);
      let workingPayment = payment;
      if (!workingPayment) {
        workingPayment = await createInvoiceDraft(buildDraftPayload());
        navigate(getInvoiceDetailPath(workspacePrefix, workingPayment.id), {
          replace: true,
        });
      } else if (
        hasDraftChanges ||
        (!payment?.visit_id &&
          (selectedCustomer?.id !== "walk-in" ||
            String(customerName || "").trim() !==
              String(workingPayment?.customer_name || "").trim()))
      ) {
        workingPayment = await updatePayment(
          workingPayment.id,
          buildDraftPayload(),
        );
      } else if (payment?.visit_id) {
        workingPayment = await generatePaymentDraft(payment.visit_id);
      }
      if (!workingPayment?.id) {
        pushToast({
          message: "Invoice not ready.",
          severity: "error",
        });
        return;
      }
      const wid = workingPayment.id;
      if (
        paymentCollectionMode === "partial" &&
        String(partialDueDate || "").trim() !== "" &&
        invoiceAmountDueBeforeNextPayment(workingPayment, totals.grand) -
          Number(partialPaymentAmount || 0) >
          0.005
      ) {
        workingPayment = await updatePayment(wid, { due_date: partialDueDate });
      }
      const collection = resolvePaymentCollectionAmount({
        paymentCollectionMode,
        partialPaymentAmount,
        payment: workingPayment,
        totalsGrand: totals.grand,
      });
      if (!collection.ok) {
        if (collection.reason === "partial_empty") {
          pushToast({
            message: "Enter a partial amount greater than zero.",
            severity: "warning",
          });
        } else if (collection.reason === "exceeds_balance") {
          pushToast({
            message: "Payment amount cannot exceed the remaining balance.",
            severity: "warning",
          });
        } else {
          pushToast({
            message: "Nothing left to pay on this invoice.",
            severity: "warning",
          });
        }
        return;
      }
      await addPaymentTransaction(wid, {
        amount: collection.amount,
        transaction_method_id: selectedTransactionMethodId,
      });
      const refreshed = await getPaymentById(wid);
      setPayment(refreshed);
      setLines(normalizePaymentLines(refreshed?.items));
      setOrderDiscount(normalizeOrderDiscount(refreshed?.items));
      setNotes(refreshed?.notes || "");
      if (String(refreshed?.status || "").toLowerCase() === "partial") {
        setPartialPaymentAmount("");
      }
      pushToast({
        message:
          paymentCollectionMode === "partial"
            ? "Payment recorded. Opening print preview..."
            : "Payment completed. Opening print preview...",
        severity: "success",
      });
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      window.print();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Unable to complete payment and print."),
        severity: "error",
      });
    } finally {
      setMakingPayment(false);
    }
  };

  const handleVoidInvoice = async () => {
    if (!payment?.id || voidingInvoice) return;
    const ok = await askConfirm({
      title: "Void this invoice?",
      message:
        "The invoice will be marked void and can no longer be paid or edited.",
      confirmText: "Void invoice",
      cancelText: "Cancel",
    });
    if (!ok) return;
    try {
      setVoidingInvoice(true);
      await voidPayment(payment.id);
      const refreshed = await getPaymentById(payment.id);
      setPayment(refreshed);
      pushToast({ message: "Invoice voided.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Unable to void invoice."),
        severity: "error",
      });
    } finally {
      setVoidingInvoice(false);
    }
  };

  const status = String(payment?.status || "").toLowerCase();
  const canRefreshDraft =
    isNewInvoiceMode || isDraftRefreshablePaymentStatus(status);
  const canEditDraft =
    isNewInvoiceMode || (canSellPackagesAndDiscounts && canRefreshDraft);
  const consultationSkipped = Boolean(payment?.visit?.consultation_skipped);
  const canVoidInvoice =
    canEditPayments &&
    !isNewInvoiceMode &&
    Boolean(payment?.id) &&
    !["paid", "void"].includes(status);

  const activeTransactionMethods = useMemo(() => {
    const active = transactionMethods.filter((m) => m.status === "active");
    if (
      selectedTransactionMethodId &&
      !active.some((m) => m.id === selectedTransactionMethodId)
    ) {
      const extra = transactionMethods.find(
        (m) => m.id === selectedTransactionMethodId,
      );
      if (extra) {
        return [...active, extra];
      }
    }
    return active;
  }, [transactionMethods, selectedTransactionMethodId]);

  const receiveViaGrouped = useMemo(
    () => groupedTransactionMethodsForSelect(activeTransactionMethods),
    [activeTransactionMethods],
  );

  const receiptMeta = useMemo(() => {
    const pay = payment;
    const tmFromApi = pay?.transaction_method;
    let label = "";
    if (tmFromApi && typeof tmFromApi === "object") {
      label = [tmFromApi.name, tmFromApi.bank_name, tmFromApi.account_or_phone]
        .filter(Boolean)
        .join(" · ");
    }
    if (!label && selectedTransactionMethodId) {
      const m = transactionMethods.find(
        (x) => x.id === selectedTransactionMethodId,
      );
      if (m) {
        label = [m.name, m.bank_name, m.account_or_phone]
          .filter(Boolean)
          .join(" · ");
      }
    }
    const st = String(pay?.status || "").toLowerCase();
    const grand = Number(totals.grand || 0);
    if (st === "paid") {
      const due = pay?.due_date
        ? dayjs(pay.due_date).format("DD-MM-YYYY")
        : null;
      return {
        receiveViaLabel: label,
        paymentMode: "full",
        partialAmount: null,
        remainingAmount: null,
        dueDateLabel: due,
      };
    }
    if (st === "partial") {
      const balance = invoiceAmountDueBeforeNextPayment(pay, grand);
      const paidFromApi = Number(pay?.paid_amount ?? 0);
      const totalInv = Number(pay?.total_amount ?? grand);
      const paidSoFar =
        paidFromApi > 0
          ? paidFromApi
          : Math.max(0, Number((totalInv - balance).toFixed(2)));
      const paidThis = Number(partialPaymentAmount || 0);
      const remaining =
        paymentCollectionMode === "partial" && paidThis > 0
          ? previewRemainingAfterPartialPayment({
              payment: pay,
              totalsGrand: grand,
              partialPaymentAmount,
            })
          : balance;
      const due =
        String(partialDueDate || "").trim() !== ""
          ? dayjs(partialDueDate).format("DD-MM-YYYY")
          : pay?.due_date
            ? dayjs(pay.due_date).format("DD-MM-YYYY")
            : null;
      return {
        receiveViaLabel: label,
        paymentMode: "partial",
        partialAmount:
          paymentCollectionMode === "partial" && paidThis > 0
            ? paidThis
            : paidSoFar > 0
              ? paidSoFar
              : null,
        remainingAmount: Number.isFinite(remaining) ? remaining : null,
        dueDateLabel: due,
      };
    }
    if (paymentCollectionMode === "partial") {
      const paidThis = Number(partialPaymentAmount || 0);
      const remaining = previewRemainingAfterPartialPayment({
        payment: pay,
        totalsGrand: grand,
        partialPaymentAmount,
      });
      const due =
        String(partialDueDate || "").trim() !== ""
          ? dayjs(partialDueDate).format("DD-MM-YYYY")
          : pay?.due_date
            ? dayjs(pay.due_date).format("DD-MM-YYYY")
            : null;
      return {
        receiveViaLabel: label,
        paymentMode: "partial",
        partialAmount: paidThis > 0 ? paidThis : null,
        remainingAmount: remaining,
        dueDateLabel: due,
      };
    }

    const due = pay?.due_date ? dayjs(pay.due_date).format("DD-MM-YYYY") : null;
    return {
      receiveViaLabel: label,
      paymentMode: "full",
      partialAmount: null,
      remainingAmount: null,
      dueDateLabel: due,
    };
  }, [
    payment,
    paymentCollectionMode,
    partialDueDate,
    partialPaymentAmount,
    selectedTransactionMethodId,
    totals.grand,
    transactionMethods,
  ]);

  const invoiceTerminal = isInvoiceTerminalStatus(status);
  const canPrintReceipt = status !== "void";

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <LoadingIndicator size={112} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">{error || "Invoice not found."}</Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={handleBackClick}>
          Back to Invoices
        </Button>
      </Box>
    );
  }

  return (
    <Box className="payment-detail-page">
      <PaymentDetailPrintStyles />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ mb: 2 }}
        className="no-print"
      >
        <Box>
          <Typography variant="h5">Invoice Details</Typography>
          <Typography variant="body2" color="text.secondary">
            {isNewInvoiceMode ? (
              <>
                New draft —{" "}
                {resolvePaymentCustomerName(payment, customerName) || "-"}
              </>
            ) : (
              <>
                {payment?.invoice_number ||
                  (payment?.id ? `Record #${payment.id}` : "—")}
                {(() => {
                  if (status === "issued" || status === "unpaid")
                    return " · Issued";
                  if (status === "draft") return " · Draft";
                  if (status === "partial") return " · Partial";
                  if (status === "paid") return " · Paid";
                  if (status === "void") return " · Void";
                  return "";
                })()}
                {" — "}
                {resolvePaymentCustomerName(payment, customerName) || "-"}
              </>
            )}
          </Typography>
        </Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mt: { xs: 1, sm: 0 }, width: { xs: "100%", sm: "auto" } }}
        >
          <Button
            variant="outlined"
            onClick={handleBackClick}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Back
          </Button>
          {canVoidInvoice ? (
            <Button
              variant="outlined"
              color="error"
              disabled={voidingInvoice || drafting}
              onClick={handleVoidInvoice}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {voidingInvoice ? "Voiding…" : "Void invoice"}
            </Button>
          ) : null}
          <Button
            variant="contained"
            disabled={status === "void" || drafting}
            onClick={handleGenerateInvoice}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {(() => {
              if (isNewInvoiceMode) {
                return drafting ? "Saving..." : "Save Draft";
              }
              if (isInvoicePreviewOpenStatus(status)) {
                if (hasDraftChanges) {
                  return drafting ? "Saving..." : "Save";
                }
                return drafting ? "Opening..." : "Preview Invoice";
              }
              return drafting ? "Generating..." : "Generate Invoice";
            })()}
          </Button>
        </Stack>
      </Stack>

      {consultationSkipped && (
        <Alert severity="warning" className="no-print" sx={{ mb: 2 }}>
          Consultation skipped for this visit. No consultation data is saved and
          consultation fee is not collected.
        </Alert>
      )}

      {prescriptionInvoiceReminders.length > 0 && (
        <Alert severity="warning" className="no-print" sx={{ mb: 2 }}>
          Prescription reminder:{" "}
          {prescriptionInvoiceReminders
            .map((item) => item?.medicine_name)
            .filter(Boolean)
            .join(", ")}{" "}
          {prescriptionInvoiceReminders.length === 1 ? "was" : "were"} not added
          to this invoice because the doctor unchecked Add to invoice.
        </Alert>
      )}

      <Box className="print-root">
        <Paper
          className="print-paper print-receipt"
          sx={{
            borderRadius: 2,
            border: "1px solid #E5E7EB",
            p: 2,
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            width: "100%",
            maxWidth: "100%",
          }}
        >
          <Box
            className="print-receipt-body"
            sx={{
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <InvoiceReceiptHeader
              settings={settings}
              payment={payment}
              customerName={customerDisplayName}
              salesPersonName={salesPersonName}
            />
            <Box className="no-print">
              <InvoiceReceiptPaymentMeta receiptMeta={receiptMeta} />
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {isNewInvoiceMode && (
              <>
                <Box sx={{ mb: 2 }} className="no-print">
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                  >
                    Customer
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                    <Autocomplete
                      sx={{ minWidth: { xs: 0, md: 260 }, flex: 1 }}
                      options={customerOptions}
                      loading={customerSearchLoading}
                      value={selectedCustomer}
                      onChange={(_, value) => {
                        setSelectedCustomer(value);
                        if (!value) return;
                        if (value.id === "walk-in") {
                          setCustomerName("Walk-in customer");
                          setCustomerPhone("");
                          setCustomerQuery("Walk-in customer");
                          return;
                        }
                        setCustomerName(value.name || "");
                        setCustomerPhone(value.phone || "");
                        setCustomerQuery(value.name || "");
                      }}
                      getOptionLabel={(option) => option?.name || ""}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Customer name"
                          required
                          value={customerQuery}
                          onChange={(e) => {
                            setCustomerQuery(e.target.value);
                            setCustomerName(e.target.value);
                          }}
                        />
                      )}
                    />
                    <TextField
                      label="Phone number (optional)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      sx={{ minWidth: { xs: 0, md: 220 } }}
                    />
                  </Stack>
                </Box>
                <Divider sx={{ my: 1.5 }} />
              </>
            )}

            <Box className="no-print" sx={{ mb: 1.5 }}>
              <Chip
                label={
                  status === "paid"
                    ? "Paid"
                    : status === "partial"
                      ? "Partial"
                      : status === "void"
                        ? "Void"
                        : status === "draft"
                          ? "Draft"
                          : status === "issued" || status === "unpaid"
                            ? "Issued"
                            : status
                }
                color={
                  status === "paid"
                    ? "success"
                    : status === "partial"
                      ? "info"
                      : status === "void"
                        ? "default"
                        : status === "draft"
                          ? "default"
                          : "warning"
                }
                size="small"
              />
            </Box>

            <PaymentInvoiceLinesEditor
              lines={lines}
              canEditDraft={canEditDraft}
              productOptions={productOptions}
              packagePickerOptions={packagePickerOptions}
              treatmentPickerOptions={treatmentPickerOptions}
              setLineValue={setLineValue}
              handleLineTypeChange={handleLineTypeChange}
              handleLabelBlur={handleLabelBlur}
              handlePriceBlur={handlePriceBlur}
              handleRemoveLine={handleRemoveLine}
            />

            <Box className="print-only">
              <InvoiceReceiptLineTable lines={lines} layout="a5" />
            </Box>

            {canEditDraft && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ mt: 1 }}
                className="no-print"
              >
                <Button
                  startIcon={<AddIcon />}
                  variant="outlined"
                  size="small"
                  onClick={handleAddLine}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  Add invoice item
                </Button>
              </Stack>
            )}

            {!isNewInvoiceMode &&
              payment?.visit_id &&
              canEditDraft &&
              availablePatientPackageItems.length > 0 && (
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems={{ xs: "stretch", md: "center" }}
                  className="no-print"
                  sx={{ mt: 1 }}
                >
                  <FormControl
                    size="small"
                    sx={{
                      minWidth: { xs: 0, md: 280 },
                      width: { xs: "100%", md: "auto" },
                    }}
                  >
                    <InputLabel>Apply patient package usage</InputLabel>
                    <Select
                      label="Apply patient package usage"
                      value={selectedPatientPackageItemId}
                      onChange={(e) =>
                        setSelectedPatientPackageItemId(e.target.value)
                      }
                    >
                      <MenuItem value="">Select package line</MenuItem>
                      {availablePatientPackageItems.map((item) => (
                        <MenuItem key={item.id} value={String(item.id)}>
                          {item?.patient_package?.package?.name || "Package"} -{" "}
                          {item?.treatment_template?.name || "Treatment"} (
                          {item?.remaining_sessions} left)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={
                      !selectedPatientPackageItemId || applyingPatientPackage
                    }
                    onClick={handleApplyPatientPackageByCashier}
                    sx={{ width: { xs: "100%", md: "auto" } }}
                  >
                    {applyingPatientPackage
                      ? "Applying..."
                      : "Apply by cashier (memo tag)"}
                  </Button>
                </Stack>
              )}

            <Box
              className="invoice-print-totals-wrap"
              sx={{ mt: "auto", pt: 1.5 }}
            >
              <Divider sx={{ mb: 1.5 }} />

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  width: "100%",
                }}
              >
                <Stack
                  spacing={1}
                  sx={{
                    width: "100%",
                    maxWidth: { xs: "100%", sm: 380 },
                    alignSelf: "flex-end",
                  }}
                >
                  {canEditDraft && (
                    <Box
                      className="no-print"
                      sx={{ display: "flex", gap: 1, mb: 0.75 }}
                    >
                      <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                        <InputLabel>Order discount</InputLabel>
                        <Select
                          label="Order discount"
                          value={orderDiscount.type}
                          onChange={(e) =>
                            setOrderDiscount((prev) => ({
                              ...prev,
                              type: e.target.value,
                            }))
                          }
                        >
                          {DISCOUNT_TYPE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        type="number"
                        label="Value"
                        value={orderDiscount.value}
                        onChange={(e) =>
                          setOrderDiscount((prev) => ({
                            ...prev,
                            value: Number(e.target.value || 0),
                          }))
                        }
                        inputProps={{
                          min: 0,
                          step: orderDiscount.type === "percent" ? 1 : 100,
                          max:
                            orderDiscount.type === "percent" ? 100 : undefined,
                        }}
                        disabled={orderDiscount.type === "none"}
                        sx={{ width: 140, flexShrink: 0 }}
                      />
                    </Box>
                  )}
                  {canApplyStoreCredit &&
                    storeCreditBalance > 0 &&
                    payment?.id &&
                    Number(payment.balance ?? 0) > 0 && (
                      <Stack
                        direction="row"
                        spacing={1}
                        className="no-print"
                        sx={{ mb: 1 }}
                      >
                        <TextField
                          size="small"
                          type="number"
                          label="Apply store credit"
                          value={storeCreditApplyAmount}
                          onChange={(e) =>
                            setStoreCreditApplyAmount(e.target.value)
                          }
                          helperText={`Available: ${storeCreditBalance}`}
                          sx={{ flex: 1 }}
                        />
                        <Button
                          variant="outlined"
                          disabled={applyingStoreCredit}
                          onClick={handleApplyStoreCredit}
                        >
                          {applyingStoreCredit ? "Applying…" : "Apply"}
                        </Button>
                      </Stack>
                    )}
                  <InvoiceReceiptTotalsFooter totals={totals} />
                  <InvoiceReceiptPaymentSummaryRows
                    receiptMeta={receiptMeta}
                    paymentStatus={status}
                    paymentCollectionMode={paymentCollectionMode}
                    totals={totals}
                  />
                </Stack>
              </Box>
            </Box>
          </Box>

          {(canEditDraft || String(notes || "").trim() !== "") && (
            <Box
              className="invoice-print-note-footer"
              sx={{
                flexShrink: 0,
                mt: "auto",
                pt: 2,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              {canEditDraft ? (
                <Box className="no-print">
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Invoice Note
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    size="small"
                    variant="standard"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add note for this invoice..."
                    InputProps={{ disableUnderline: true }}
                    sx={{ "& .MuiInputBase-root": { fontSize: 14 } }}
                  />
                </Box>
              ) : (
                String(notes || "").trim() !== "" && (
                  <Typography
                    className="no-print"
                    variant="body2"
                    color="text.secondary"
                  >
                    {notes}
                  </Typography>
                )
              )}
              {String(notes || "").trim() !== "" && (
                <Box className="print-only" sx={{ mt: 1 }}>
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ whiteSpace: "pre-wrap" }}
                  >
                    {notes}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
          <Box className="print-only">
            <InvoiceReceiptThankYouFooter settings={settings} />
          </Box>
        </Paper>
      </Box>

      <PaymentDetailInvoicePreviewDialog
        open={openPreview}
        onClose={() => setOpenPreview(false)}
        invoiceTerminal={invoiceTerminal}
        canPrintReceipt={canPrintReceipt}
        selectedTransactionMethodId={selectedTransactionMethodId}
        onSelectTransactionMethodId={setSelectedTransactionMethodId}
        receiveViaGrouped={receiveViaGrouped}
        paymentCollectionMode={paymentCollectionMode}
        onPaymentCollectionModeChange={setPaymentCollectionMode}
        partialPaymentAmount={partialPaymentAmount}
        onPartialPaymentAmountChange={setPartialPaymentAmount}
        partialDueDate={partialDueDate}
        onPartialDueDateChange={setPartialDueDate}
        totals={totals}
        settings={settings}
        payment={payment}
        customerName={customerDisplayName}
        salesPersonName={salesPersonName}
        lines={lines}
        notes={notes}
        receiptMeta={receiptMeta}
        makingPayment={makingPayment}
        canCompletePayment={canCompletePayment}
        onPrintReceipt={() => window.print()}
        onMakePaymentAndPrint={handleMakePaymentAndPrint}
      />
    </Box>
  );
}
