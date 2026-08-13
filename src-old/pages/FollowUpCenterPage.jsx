import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MedicalServicesOutlinedIcon from "@mui/icons-material/MedicalServicesOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import PhoneCallbackOutlinedIcon from "@mui/icons-material/PhoneCallbackOutlined";
import RedeemOutlinedIcon from "@mui/icons-material/RedeemOutlined";
import dayjs from "dayjs";
import ClickablePhoneChips from "../components/common/ClickablePhoneChips";
import LoadingIndicator from "../components/common/LoadingIndicator";
import GuidedEmptyState from "../components/common/GuidedEmptyState";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../components/common/CollapsibleFilters";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { resolveApiError } from "../services/apiClient";
import FollowUpHistoryPanel from "../components/followUp/FollowUpHistoryPanel";
import {
  completeFollowUpTask,
  assignFollowUpTask,
  getFollowUpSummary,
  getFollowUpTask,
  listFollowUpTasks,
  listFollowUpAssignableStaff,
  rescheduleFollowUpTask,
  skipFollowUpTask,
  startFollowUpTask,
  submitFollowUpOutcome,
} from "../services/followUpService";
import useToastStore from "../stores/toastStore";
import useConfirmStore from "../stores/confirmStore";
import useAuthStore from "../stores/authStore";
import { hasPermission, hasRole } from "../utils/accessUtils";
import { getUserLiveBoardPath } from "../utils/workspaceRoutes";
import {
  clearFollowUpDraft,
  readFollowUpDraft,
  writeFollowUpDraft,
} from "../utils/followUpDraftStorage";

const typeLabels = {
  treatment: "Treatment",
  package: "Package",
  after_service: "After Service",
};

const statusLabels = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
};

const emptyFilters = {
  type: "",
  status: "",
  due: "",
  assigned_to_me: false,
};

const emptyDraft = {
  call_status: "answered",
  feedback_status: "interested",
  feedback: "",
  due_date: "",
};

const emptySummary = {
  overdue: 0,
  today: 0,
  in_progress: 0,
  upcoming: 0,
};

const TABLE_COL_COUNT = 8;

const EMPTY_STEPS = [
  {
    icon: PaymentsOutlinedIcon,
    title: "After service",
    body: "When a visit payment is completed, a call task is due two days later to check how the patient is doing.",
  },
  {
    icon: MedicalServicesOutlinedIcon,
    title: "Treatment follow-up",
    body: "If a treatment record includes a follow-up date within the next 30 days, a task appears on that due date.",
  },
  {
    icon: RedeemOutlinedIcon,
    title: "Package reminders",
    body: "The daily scanner creates tasks for active packages expiring soon or with sessions left to use.",
  },
];

const FOLLOW_UP_GUIDE_STORAGE_KEY =
  "dermafairy_follow_up_guide_dismiss_permanent";
const FOLLOW_UP_GUIDE_LANG_KEY = "dermafairy_follow_up_guide_lang";

function readFollowUpGuidePermanentlyDismissed() {
  try {
    return localStorage.getItem(FOLLOW_UP_GUIDE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readFollowUpGuideLang() {
  try {
    const v = localStorage.getItem(FOLLOW_UP_GUIDE_LANG_KEY);
    if (v === "en" || v === "my") return v;
  } catch {
    /* ignore */
  }
  return "my";
}

/** Task type labels and automation rules; technical terms stay in English. */
const FOLLOW_UP_GUIDE_I18N = {
  my: {
    title: "Follow-Up Center မှာ ဘာတွေ ပေါ်လာမလဲ",
    subtitle:
      "အောက်ပါ task များကို စနစ်က အလိုအလျောက် ဖန်တီးပေးပါသည်။ Reception / Sales ဝန်ထမ်းများသည် မိမိထံ assign လုပ်ထားသော task များကိုသာ မြင်ရပါသည်။",
    bullets: [
      "After Service — ဝန်ဆောင်မှု ပြီးဆုံးပြီး payment လုပ်ပြီးသည့်နောက် ၂ ရက်အကြာတွင် task တစ်ခု ပေါ်လာပါသည်။ လူနာ အခြေအနေ စစ်ဆေးရန် ခေါ်ဆိုပါ။",
      "Treatment — ဆရာဝန်/ therapist မှ treatment မှတ်တမ်းတွင် follow-up date သတ်မှတ်ထားပါက (အများဆုံး ၃၀ ရက်အတွင်း) ထို ရက်နေ့တွင် treatment follow-up task ပေါ်လာပါသည်။",
      "Package — active package သည် သက်တမ်းကုန်ခါနီး (၃၀ ရက်အတွင်း) သို့မဟုတ် ကျန်ရှိသော sessions ရှိနေပါက နေ့စဉ် စနစ်စစ်ဆေးမှု (မနက် ၈:၀၀) ဖြင့် package follow-up task ပေါ်လာပါသည်။",
      "Task တစ်ခုကို အတူတူ အမျိုးအစား + source အတွက် active (pending / in progress) ရှိနေပါက ထပ်မဖန်တီးပါ — တစ်ခုသာ ပြပါသည်။",
      "Row သို့မဟုတ် card ကို နှိပ်ပြီး ခေါ်ဆိုမှု မှတ်တမ်းတင်ပါ။ Phone chip ဖြင့် တိုက်ရိုက် ခေါ်ဆိုနိုင်ပါသည်။ Admin/Owner သည် staff သို့ assign လုပ်နိုင်ပါသည်။",
      "No Response + Save သည် attempt တိုးပြီး task ကို ဖွင့်ထားပါသည် (အများဆုံး ၃ ကြိမ်)။ Follow Again + Save သည် parent တွင် attempt တိုးပြီး task ကို အလိုအလျောက် ပိတ်ပါသည်။",
      "Follow Again + Save နှိပ်ပါက parent task တွင် attempt တိုးပြီး အလိုအလျောက် ပိတ်ပါသည်။ Task အသစ်သည် မှတ်တမ်းနှင့် description ကို ဆက်ခံသည်။ Patient timeline တွင်လည်း မြင်ရပါသည်။",
      "Complete သည် လူနာနှင့် စကားပြောပြီး အဆုံးသတ်သောအခါသာ (Interested / Not Interested) သုံးပါ — No Response / Follow Again အတွက် Complete မသုံးပါနှင့်။",
    ],
    dontShowAgain: "ထပ်မပြပါနှင့်",
    close: "ပိတ်ရန်",
    ariaClose: "လမ်းညွှန်ချက် ပိတ်ရန်",
    toggleMy: "မြန်မာ",
    toggleEn: "English",
  },
  en: {
    title: "What appears in Follow-Up Center",
    subtitle:
      "Tasks below are created automatically by the system. Reception and sales staff only see tasks assigned to them.",
    bullets: [
      "After Service — when a visit payment is completed, a task is due 2 days after the visit time. Call to check how the patient is doing after treatment.",
      "Treatment — when a treatment record has a follow-up date set (within the next 30 days), a treatment follow-up task appears on that due date.",
      "Package — the daily scanner (08:00) creates tasks for active packages expiring within 30 days or with remaining sessions left to use.",
      "The system does not duplicate active tasks for the same type and source — only one pending or in-progress task per source is shown.",
      "Click a row or card to log the call. Use the phone chip to dial. Admins and owners can assign tasks to reception or sales staff.",
      "No Response + Save logs an attempt and keeps the task open (max 3 attempts). Follow Again + Save logs an attempt on the parent and auto-completes it.",
      "Follow Again + Save records an attempt on the parent, auto-completes it, and creates a child task with the same description and full call history. Events also appear on the patient timeline.",
      "Use Complete only when the conversation is done (Interested / Not Interested). Do not use Complete for No Response or Follow Again.",
    ],
    dontShowAgain: "Don't show again",
    close: "Close",
    ariaClose: "Close guide",
    toggleMy: "မြန်မာ",
    toggleEn: "English",
  },
};

const summaryCards = [
  {
    key: "overdue",
    label: "Overdue",
    color: "error.main",
    filterDue: "overdue",
    clickable: true,
  },
  {
    key: "today",
    label: "Due Today",
    color: "warning.main",
    filterDue: "today",
    clickable: true,
  },
  {
    key: "in_progress",
    label: "In Progress",
    color: "info.main",
    filterDue: null,
    clickable: false,
  },
  {
    key: "upcoming",
    label: "Upcoming",
    color: "success.main",
    filterDue: null,
    clickable: false,
  },
];

function dueBucket(task) {
  const due = dayjs(task?.due_date);
  if (!due.isValid()) return "upcoming";
  const today = dayjs().startOf("day");
  if (due.isBefore(today, "day")) return "overdue";
  if (due.isSame(today, "day")) return "today";
  return "upcoming";
}

function dueChip(task) {
  const bucket = dueBucket(task);
  if (bucket === "overdue") return { label: "Overdue", color: "error" };
  if (bucket === "today") return { label: "Today", color: "warning" };
  return { label: "Upcoming", color: "success" };
}

function truncateDescription(text, maxLength = 60) {
  if (!text) return "";
  const trimmed = String(text).trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}…`;
}

function AttemptBadge({ count }) {
  const attemptCount = Number(count) || 0;
  if (attemptCount < 2) return null;

  const label = attemptCount === 2 ? "2nd attempt" : "3rd+ attempt";
  const color = attemptCount >= 3 ? "error" : "warning";

  return <Chip size="small" color={color} label={label} />;
}

export default function FollowUpCenterPage() {
  const { pushToast } = useToastStore();
  const askConfirm = useConfirmStore((state) => state.askConfirm);
  const { user } = useAuthStore();
  const [filters, setFilters] = useState(emptyFilters);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [contextTask, setContextTask] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningTask, setAssigningTask] = useState(null);
  const [assignableStaff, setAssignableStaff] = useState([]);
  const [assignTargetUserId, setAssignTargetUserId] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(
    () => !readFollowUpGuidePermanentlyDismissed(),
  );
  const [dontShowGuideAgain, setDontShowGuideAgain] = useState(false);
  const [guideLang, setGuideLang] = useState(readFollowUpGuideLang);
  const [cardListRef] = useAutoAnimate();
  const [tableBodyRef] = useAutoAnimate();

  const setGuideLanguage = (lang) => {
    setGuideLang(lang);
    try {
      localStorage.setItem(FOLLOW_UP_GUIDE_LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  };

  const g = FOLLOW_UP_GUIDE_I18N[guideLang];

  const closeFollowUpGuide = () => {
    if (dontShowGuideAgain) {
      try {
        localStorage.setItem(FOLLOW_UP_GUIDE_STORAGE_KEY, "1");
      } catch {
        /* private mode / quota */
      }
    }
    setGuideOpen(false);
  };

  const canViewAllFollowUpTasks =
    hasRole(user, "owner") || hasRole(user, "admin");
  const followsUpListSelfOnly =
    (hasRole(user, "reception") || hasRole(user, "sales_marketing")) &&
    !canViewAllFollowUpTasks;
  const canViewDetails = hasPermission(user, "follow_up.update");
  const canAssign = hasPermission(user, "follow_up.assign");

  const loadPageData = async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const params = { per_page: 100 };
      if (nextFilters.type) params.type = nextFilters.type;
      if (nextFilters.status) params.status = nextFilters.status;
      if (nextFilters.due) params.due = nextFilters.due;
      if (nextFilters.assigned_to_me) params.assigned_to_me = 1;

      const [response, summaryData] = await Promise.all([
        listFollowUpTasks(params),
        getFollowUpSummary(),
      ]);
      setTasks(Array.isArray(response?.data) ? response.data : []);
      setSummary({ ...emptySummary, ...summaryData });
    } catch (err) {
      setTasks([]);
      setSummary(emptySummary);
      setError(resolveApiError(err, "Could not load follow-up tasks."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData(emptyFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const visibleTasks = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return tasks;
    const q = debouncedSearchQuery.trim().toLowerCase();
    return tasks.filter((task) =>
      (task.patient?.name ?? "").toLowerCase().includes(q),
    );
  }, [tasks, debouncedSearchQuery]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type) count += 1;
    if (filters.status) count += 1;
    if (filters.due) count += 1;
    if (filters.assigned_to_me) count += 1;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;
  const liveBoardPath = getUserLiveBoardPath(user);
  const showGuidedEmpty =
    !loading && !error && tasks.length === 0 && !hasActiveFilters;
  const showFilteredEmpty =
    !loading && !error && tasks.length === 0 && hasActiveFilters;
  const showSearchEmpty =
    !loading && tasks.length > 0 && visibleTasks.length === 0;

  const handleSummaryFilter = (due) => {
    const nextFilters = { ...emptyFilters, due };
    setFilters(nextFilters);
    loadPageData(nextFilters);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setFilters(emptyFilters);
    loadPageData(emptyFilters);
  };

  useEffect(() => {
    if (!selectedTask?.id) return undefined;
    const id = selectedTask.id;
    const handle = setTimeout(() => {
      writeFollowUpDraft(id, draft);
    }, 450);
    return () => clearTimeout(handle);
  }, [draft, selectedTask?.id]);

  const activeTask = useMemo(
    () => tasks.find((item) => item.id === selectedTask?.id) || selectedTask,
    [tasks, selectedTask],
  );

  const openWorkDialog = (task) => {
    const stored = readFollowUpDraft(task.id);
    setSelectedTask(task);
    setDraft({
      call_status:
        stored?.call_status ?? task.call_status ?? emptyDraft.call_status,
      feedback_status:
        stored?.feedback_status ??
        task.feedback_status ??
        emptyDraft.feedback_status,
      feedback: stored?.feedback ?? task.feedback ?? "",
      due_date:
        stored?.due_date ??
        (task.due_date ? String(task.due_date).slice(0, 10) : ""),
    });
  };

  const exitWorkDialog = (persistCurrentDraft = true) => {
    if (persistCurrentDraft && selectedTask?.id) {
      writeFollowUpDraft(selectedTask.id, draft);
    }
    setSelectedTask(null);
    setDraft(emptyDraft);
  };

  const openContextDialog = async (task) => {
    const fresh = tasks.find((row) => row.id === task.id) || task;
    setContextTask(fresh);
    try {
      setContextLoading(true);
      const full = await getFollowUpTask(task.id);
      setContextTask(full);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not load task history."),
        severity: "error",
      });
    } finally {
      setContextLoading(false);
    }
  };

  const handleOpenFollowUpWork = async (task) => {
    if (!task?.assigned_to && !canViewAllFollowUpTasks) {
      pushToast({
        message: "This task is not assigned yet. Please assign staff first.",
        severity: "warning",
      });
      return;
    }

    if (
      !canViewAllFollowUpTasks &&
      (task.assigned_to?.id ?? task.assigned_to) !== user?.id
    ) {
      pushToast({
        message: "Only assigned staff can start this follow-up task.",
        severity: "warning",
      });
      return;
    }

    try {
      const updated = await startFollowUpTask(task.id);
      setTasks((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      openWorkDialog(updated);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not start this follow-up task."),
        severity: "error",
      });
    }
  };

  const handleRescheduleFollowUp = async () => {
    if (!activeTask || !draft.due_date) return;
    const confirmed = await askConfirm({
      title: "Confirm Reschedule",
      message: "Reschedule this follow-up task to the selected date?",
      confirmText: "Confirm",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      await rescheduleFollowUpTask(activeTask.id, draft.due_date);
      clearFollowUpDraft(activeTask.id);
      exitWorkDialog(false);
      await loadPageData(filters);
      pushToast({ message: "Task rescheduled.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Action failed."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const isDeferredOutcome =
    draft.feedback_status === "no_response" ||
    draft.feedback_status === "follow_again";

  const handleSaveFollowUp = async () => {
    if (!activeTask || saving) return;

    const nextAttempt = (activeTask.attempt_count ?? 0) + 1;

    if (draft.feedback_status === "no_response") {
      const confirmed = await askConfirm({
        title: "Log no response?",
        message: `This will record attempt ${nextAttempt} of 3. The task stays open for another call.`,
        confirmText: "Save",
        cancelText: "Cancel",
      });
      if (!confirmed) return;
    } else if (draft.feedback_status === "follow_again") {
      const confirmed = await askConfirm({
        title: "Schedule follow-up?",
        message:
          "This records an attempt, completes the current task, and schedules a new one in 2–3 days with the same notes history.",
        confirmText: "Save",
        cancelText: "Cancel",
      });
      if (!confirmed) return;
    }

    try {
      setSaving(true);
      const updated = await submitFollowUpOutcome(activeTask.id, draft);
      clearFollowUpDraft(activeTask.id);
      exitWorkDialog(false);
      await loadPageData(filters);

      if (draft.feedback_status === "no_response") {
        pushToast({
          message: `No response saved (attempt ${updated.attempt_count ?? nextAttempt}/3). Task stays open.`,
          severity: "success",
        });
      } else if (draft.feedback_status === "follow_again") {
        const due = updated.follow_again_scheduled?.due_date;
        const parentAttempts =
          updated.follow_again_scheduled?.parent_attempt_count ??
          updated.attempt_count;
        pushToast({
          message: due
            ? `Attempt ${parentAttempts} logged. New task due ${dayjs(due).format("DD-MM-YYYY")} — prior calls are in history.`
            : "Follow-up saved. Check the list for the new task (due in 2–3 days).",
          severity: "success",
        });
      } else {
        pushToast({
          message: "Attempt saved. Task stays open.",
          severity: "success",
        });
      }
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not save this attempt."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteFollowUp = async () => {
    if (!activeTask || isDeferredOutcome) return;
    const confirmed = await askConfirm({
      title: "Confirm Complete",
      message: "Mark this follow-up as finished? Use Save instead if you still need to call back.",
      confirmText: "Confirm",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      await submitFollowUpOutcome(activeTask.id, draft);
      await completeFollowUpTask(activeTask.id);
      clearFollowUpDraft(activeTask.id);
      exitWorkDialog(false);
      await loadPageData(filters);
      pushToast({ message: "Task completed.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Action failed."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkipFollowUp = async () => {
    if (!activeTask) return;
    const confirmed = await askConfirm({
      title: "Confirm Skip",
      message:
        "Close this follow-up without marking it completed? It will be recorded as skipped.",
      confirmText: "Confirm",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      await submitFollowUpOutcome(activeTask.id, draft);
      await skipFollowUpTask(activeTask.id);
      clearFollowUpDraft(activeTask.id);
      exitWorkDialog(false);
      await loadPageData(filters);
      pushToast({ message: "Task skipped.", severity: "success" });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Action failed."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const openAssignModal = async (task) => {
    if (!canAssign) return;
    setAssigningTask(task);
    setAssignTargetUserId(
      task.assigned_to?.id ? String(task.assigned_to.id) : "",
    );
    setAssignModalOpen(true);
    if (assignableStaff.length > 0) return;

    try {
      setStaffLoading(true);
      const staff = await listFollowUpAssignableStaff();
      setAssignableStaff(staff);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not load assignable staff."),
        severity: "error",
      });
    } finally {
      setStaffLoading(false);
    }
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningTask(null);
    setAssignTargetUserId("");
  };

  const confirmAndAssignTask = async () => {
    if (!assigningTask || !assignTargetUserId) {
      pushToast({
        message: "Please select one staff member.",
        severity: "warning",
      });
      return;
    }

    const selectedStaff = assignableStaff.find(
      (item) => item.id === Number(assignTargetUserId),
    );
    const confirmed = await askConfirm({
      title: "Confirm Assignment",
      message: `Assign this task to ${selectedStaff?.name || "selected staff"}?`,
      confirmText: "Yes",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      await assignFollowUpTask(assigningTask.id, Number(assignTargetUserId));
      exitWorkDialog(false);
      closeAssignModal();
      await loadPageData(filters);
      pushToast({
        message: "Task assigned successfully.",
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not assign task."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const filterControls = (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1.5,
        alignItems: { xs: "stretch", md: "flex-end" },
      }}
    >
      <TextField
        size="small"
        label="Search"
        placeholder="Patient name..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{
          flex: { xs: "1 1 100%", sm: "1 1 200px" },
          maxWidth: { sm: 240 },
        }}
      />
      <TextField
        select
        size="small"
        label="Type"
        value={filters.type}
        onChange={(e) =>
          setFilters((prev) => ({ ...prev, type: e.target.value }))
        }
        sx={{ flex: { xs: "1 1 calc(50% - 6px)", md: "0 1 150px" } }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="treatment">Treatment</MenuItem>
        <MenuItem value="package">Package</MenuItem>
        <MenuItem value="after_service">After Service</MenuItem>
      </TextField>
      <TextField
        select
        size="small"
        label="Status"
        value={filters.status}
        onChange={(e) =>
          setFilters((prev) => ({ ...prev, status: e.target.value }))
        }
        sx={{ flex: { xs: "1 1 calc(50% - 6px)", md: "0 1 150px" } }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="pending">Pending</MenuItem>
        <MenuItem value="in_progress">In Progress</MenuItem>
        <MenuItem value="completed">Completed</MenuItem>
        <MenuItem value="skipped">Skipped</MenuItem>
      </TextField>
      <TextField
        select
        size="small"
        label="Due"
        value={filters.due}
        onChange={(e) =>
          setFilters((prev) => ({ ...prev, due: e.target.value }))
        }
        sx={{ flex: { xs: "1 1 calc(50% - 6px)", md: "0 1 140px" } }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="today">Today</MenuItem>
        <MenuItem value="overdue">Overdue</MenuItem>
        <MenuItem value="upcoming">Upcoming</MenuItem>
      </TextField>
      {!followsUpListSelfOnly ? (
        <TextField
          select
          size="small"
          label="Assigned"
          value={filters.assigned_to_me ? "me" : ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              assigned_to_me: e.target.value === "me",
            }))
          }
          sx={{ flex: { xs: "1 1 calc(50% - 6px)", md: "0 1 150px" } }}
        >
          <MenuItem value="">All staff</MenuItem>
          <MenuItem value="me">Assigned to me</MenuItem>
        </TextField>
      ) : null}
    </Box>
  );

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Follow-Up Center
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
          >
            {followsUpListSelfOnly
              ? "Tasks assigned to you. Admins and owners can assign work from the full list."
              : "Track and complete patient follow-up tasks."}
          </Typography>
        </Box>
        <CollapsibleFiltersToggle
          open={filtersOpen}
          onToggle={setFiltersOpen}
          activeCount={activeFilterCount}
        />
      </Stack>

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
                  onClick={closeFollowUpGuide}
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
                onClick={closeFollowUpGuide}
              >
                {g.close}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Collapse>

      {!showGuidedEmpty ? (
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 1,
          mb: 2,
        }}
      >
        {summaryCards.map((card) => (
          <Paper
            key={card.key}
            variant="outlined"
            onClick={
              card.clickable
                ? () => handleSummaryFilter(card.filterDue)
                : undefined
            }
            sx={{
              flex: 1,
              minWidth: 0,
              px: 1,
              py: 0.75,
              borderRadius: 1.5,
              cursor: card.clickable ? "pointer" : "default",
              borderColor: card.color,
              textAlign: "center",
              "&:hover": card.clickable
                ? { bgcolor: "action.hover" }
                : undefined,
            }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
              lineHeight={1.2}
              sx={{
                color: card.color,
                fontSize: { xs: "1.1rem", sm: "1.25rem" },
              }}
            >
              {summary[card.key] ?? 0}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
              sx={{ fontSize: { xs: "0.65rem", sm: "0.7rem" } }}
            >
              {card.label}
            </Typography>
          </Paper>
        ))}
      </Box>
      ) : null}

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={() => loadPageData(filters)}
        onClear={clearFilters}
        clearLabel="Clear"
      >
        {filterControls}
      </CollapsibleFiltersPanel>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : showGuidedEmpty ? (
        <GuidedEmptyState
          icon={PhoneCallbackOutlinedIcon}
          title="No follow-up tasks yet"
          description={
            followsUpListSelfOnly
              ? "Tasks appear here when the system creates them and an admin or owner assigns them to you. After-service, treatment, and package rules run automatically in the background."
              : "Follow-up tasks are created automatically after completed visits, scheduled treatment follow-ups, and package expiry scans. Assign staff and log calls here once tasks appear."
          }
          steps={EMPTY_STEPS}
          footer={
            <>
              After-service tasks start after visit payment on the{" "}
              <Typography
                component={RouterLink}
                to={liveBoardPath}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Live Board
              </Typography>
              .
            </>
          }
        />
      ) : (
        <>
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        {showFilteredEmpty ? (
          <Paper sx={{ py: 4, textAlign: "center", borderRadius: 2 }}>
            <Typography color="text.secondary">
              No follow-up tasks match your filters.
            </Typography>
          </Paper>
        ) : null}
        {showSearchEmpty ? (
          <Paper sx={{ py: 4, textAlign: "center", borderRadius: 2 }}>
            <Typography color="text.secondary">
              No tasks match your search.
            </Typography>
          </Paper>
        ) : null}
        {!showFilteredEmpty && !showSearchEmpty ? (
          <Grid container spacing={2} ref={cardListRef}>
            {visibleTasks.map((task) => {
              const dueMeta = dueChip(task);
              return (
                <Grid key={task.id} size={{ xs: 12, sm: 6 }}>
                  <Card
                    variant="outlined"
                    onClick={() => handleOpenFollowUpWork(task)}
                    sx={{
                      borderRadius: 2,
                      height: "100%",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Stack spacing={1}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={1}
                          alignItems="flex-start"
                        >
                          <Typography
                            fontWeight={700}
                            noWrap
                            sx={{ minWidth: 0 }}
                          >
                            {task.patient?.name || "-"}{" "}
                            <Chip
                              size="small"
                              label={typeLabels[task.type] || task.type}
                            />
                          </Typography>

                          <ClickablePhoneChips phone={task.patient?.phone} />
                        </Stack>

                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          <Typography variant="body2" sx={{ minWidth: 96 }}>
                            {task.due_date
                              ? dayjs(task.due_date).format("D MMM YYYY")
                              : "-"}
                          </Typography>
                          <Chip
                            size="small"
                            color={dueMeta.color}
                            label={dueMeta.label}
                          />
                          <Chip
                            size="small"
                            label={statusLabels[task.status] || task.status}
                            color={
                              task.status === "completed"
                                ? "success"
                                : "default"
                            }
                          />
                          <AttemptBadge count={task.attempt_count} />
                        </Stack>

                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                          sx={{ minWidth: 0 }}
                        >
                          <Typography
                            variant="body2"
                            noWrap
                            color="text.secondary"
                            sx={{ flex: 1, minWidth: 0 }}
                          >
                            {task.title || "—"}
                          </Typography>
                          {canViewDetails ? (
                            <IconButton
                              size="small"
                              aria-label="Task info"
                              onClick={(e) => {
                                e.stopPropagation();
                                openContextDialog(task);
                              }}
                            >
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                          ) : null}
                        </Stack>

                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            Assigned: {task.assigned_to?.name || "—"}
                          </Typography>
                          {canAssign ? (
                            <IconButton
                              size="small"
                              aria-label="Assign staff"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssignModal(task);
                              }}
                            >
                              <PersonAddOutlinedIcon fontSize="small" />
                            </IconButton>
                          ) : null}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : null}
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          display: { xs: "none", md: "block" },
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell>Patient</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Task</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned Staff</TableCell>
            </TableRow>
          </TableHead>
          <TableBody ref={tableBodyRef}>
            {showFilteredEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={TABLE_COL_COUNT}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <Typography color="text.secondary">
                    No follow-up tasks match your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {showSearchEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={TABLE_COL_COUNT}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <Typography color="text.secondary">
                    No tasks match your search.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {!showFilteredEmpty &&
              !showSearchEmpty &&
              visibleTasks.map((task) => {
                const dueMeta = dueChip(task);
                const descriptionPreview = truncateDescription(
                  task.description,
                );
                return (
                  <TableRow
                    hover
                    key={task.id}
                    onClick={() => handleOpenFollowUpWork(task)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>
                      {task.patient?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <ClickablePhoneChips phone={task.patient?.phone} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={typeLabels[task.type] || task.type}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Stack
                        direction="row"
                        spacing={0.25}
                        alignItems="flex-start"
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" noWrap>
                            {task.title || "—"}
                          </Typography>
                          {descriptionPreview ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              display="block"
                            >
                              {descriptionPreview}
                            </Typography>
                          ) : null}
                        </Box>
                        {canViewDetails ? (
                          <IconButton
                            size="small"
                            aria-label="Task info"
                            onClick={(e) => {
                              e.stopPropagation();
                              openContextDialog(task);
                            }}
                            sx={{ mt: -0.25 }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">
                          {task.due_date
                            ? dayjs(task.due_date).format("D MMM YYYY")
                            : "-"}
                        </Typography>
                        <Chip
                          size="small"
                          color={dueMeta.color}
                          label={dueMeta.label}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Chip
                          size="small"
                          label={statusLabels[task.status] || task.status}
                          color={
                            task.status === "completed" ? "success" : "default"
                          }
                        />
                        <AttemptBadge count={task.attempt_count} />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.25} alignItems="center">
                        <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                          {task.assigned_to?.name || "—"}
                        </Typography>
                        {canAssign ? (
                          <IconButton
                            size="small"
                            aria-label="Assign staff"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignModal(task);
                            }}
                          >
                            <PersonAddOutlinedIcon fontSize="small" />
                          </IconButton>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
        </>
      )}

      <Dialog
        open={Boolean(contextTask)}
        onClose={() => setContextTask(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            width: { xs: "calc(100% - 16px)", sm: "calc(100% - 32px)" },
            m: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle>Patient &amp; task info</DialogTitle>
        <IconButton
          aria-label="close"
          onClick={() => setContextTask(null)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent dividers>
          {contextTask ? (
            <Stack spacing={2}>
              <Typography variant="h6" component="div">
                {contextTask.patient?.name || "Patient"}
              </Typography>
              {contextTask.patient?.phone ? (
                <ClickablePhoneChips phone={contextTask.patient.phone} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No phone on file.
                </Typography>
              )}
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  size="small"
                  label={typeLabels[contextTask.type] || contextTask.type}
                />
                <Typography variant="body2" color="text.secondary">
                  Attempts logged: {contextTask.attempt_count ?? 0}
                  {(contextTask.attempt_count ?? 0) >= 3 ? " (max reached)" : ""}
                </Typography>
                <AttemptBadge count={contextTask.attempt_count} />
              </Stack>
              <Divider />
              {contextTask.follow_up_context?.headline ? (
                <Typography variant="subtitle1" fontWeight={600}>
                  {contextTask.follow_up_context.headline}
                </Typography>
              ) : null}
              {(contextTask.follow_up_context?.lines || []).map((line, idx) => (
                <Typography
                  key={`${idx}-${line}`}
                  variant="body2"
                  color="text.secondary"
                >
                  {line}
                </Typography>
              ))}
              <Divider />
              {contextLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <LoadingIndicator size={24} />
                </Box>
              ) : (
                <FollowUpHistoryPanel history={contextTask.follow_up_history} />
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContextTask(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(selectedTask)}
        onClose={() => exitWorkDialog(true)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            width: { xs: "calc(100% - 16px)", sm: "calc(100% - 32px)" },
            m: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle>Log follow-up</DialogTitle>
        <IconButton
          aria-label="close"
          onClick={() => exitWorkDialog(true)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent dividers>
          {activeTask && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" color="text.secondary">
                {activeTask.patient?.name || "Patient"} ·{" "}
                {typeLabels[activeTask.type] || activeTask.type}
              </Typography>
              {(activeTask.attempt_count ?? 0) >= 1 ? (
                <Typography variant="caption" color="text.secondary">
                  Attempt: {activeTask.attempt_count}
                </Typography>
              ) : null}
              <Typography variant="caption" color="text.secondary">
                Save logs the call and keeps this task open. Complete closes the
                task when the conversation is finished (Interested / Not
                Interested). Closing this window keeps an unsaved draft on this
                device.
              </Typography>
              <FollowUpHistoryPanel history={activeTask.follow_up_history} />
              <Divider />
              <Typography variant="subtitle2" fontWeight={600}>
                Call &amp; outcome
              </Typography>
              <Stack direction="row" spacing={1}>
                {/* Call Status  */}
                <TextField
                  fullWidth
                  select
                  label="Call Status"
                  size="small"
                  value={draft.call_status}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      call_status: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="answered">Answered</MenuItem>
                  <MenuItem value="no_answer">No Answer</MenuItem>
                  <MenuItem value="busy">Busy</MenuItem>
                </TextField>
                {/* Customer Feedback */}
                <TextField
                  select
                  fullWidth
                  label="Customer Feedback"
                  size="small"
                  value={draft.feedback_status}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      feedback_status: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="interested">Interested</MenuItem>
                  <MenuItem value="not_interested">Not Interested</MenuItem>
                  <MenuItem value="no_response">No Response</MenuItem>
                  <MenuItem value="follow_again">Follow Again</MenuItem>
                </TextField>
              </Stack>
              <TextField
                label="Notes"
                multiline
                minRows={3}
                value={draft.feedback}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, feedback: e.target.value }))
                }
              />
              <TextField
                label="Reschedule date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={draft.due_date}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, due_date: e.target.value }))
                }
              />
              <Button
                variant="outlined"
                color="warning"
                disabled={saving || !activeTask || !draft.due_date}
                onClick={handleRescheduleFollowUp}
              >
                Reschedule
              </Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            justifyContent: "flex-end",
            alignItems: { xs: "stretch", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: 1,
          }}
        >
          <Stack spacing={1} sx={{ width: "100%" }}>
            <Button
              variant="outlined"
              color="inherit"
              disabled={saving || !activeTask}
              fullWidth
              onClick={handleSkipFollowUp}
            >
              Skip
            </Button>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 0.5 }}
            >
              Skip closes this task without completing it (recorded as skipped).
            </Typography>
            <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
              <Button
                variant="contained"
                disabled={saving || !activeTask}
                onClick={handleSaveFollowUp}
                sx={{ flex: 2 }}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="outlined"
                disabled={saving || !activeTask || isDeferredOutcome}
                onClick={handleCompleteFollowUp}
                sx={{ flex: 1 }}
              >
                Complete
              </Button>
            </Stack>
            {isDeferredOutcome ? (
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                No Response and Follow Again use Save — the task stays open.
                {draft.feedback_status === "follow_again"
                  ? " Save also creates the next task and shows its due date."
                  : null}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                Complete only when the follow-up is finished (patient reached
                and outcome recorded).
              </Typography>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog
        open={assignModalOpen}
        onClose={closeAssignModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Assign Follow-Up Task</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Select one staff from receptionist or sales_marketing.
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              label="Assign to"
              value={assignTargetUserId}
              disabled={staffLoading}
              onChange={(e) => setAssignTargetUserId(e.target.value)}
            >
              {assignableStaff.map((staff) => (
                <MenuItem key={staff.id} value={String(staff.id)}>
                  {staff.name} ({staff.role})
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAssignModal} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmAndAssignTask}
            disabled={saving || !assignTargetUserId}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
