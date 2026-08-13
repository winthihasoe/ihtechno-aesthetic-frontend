import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HrPageShell from "./components/HrPageShell";
import {
  createLeaveRule,
  deleteLeaveRule,
  getLeaveRules,
  updateLeaveRule,
  updateLeaveRules,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";

const emptyRuleForm = {
  label_en: "",
  label_my: "",
  description_en: "",
  description_my: "",
  is_enabled: true,
};

/** Demo leave-request rules shown when the API returns no rule list. */
const SAMPLE_LEAVE_RULES = [
  {
    key: "annual_notice",
    is_enabled: true,
    is_enforced: true,
    is_custom: false,
    label_en: "Annual leave notice period",
    label_my: "နှစ်စဉ်ခွင့် ကြိုတင်အကြောင်းကြားခြင်း",
    description_en:
      "Submit annual leave requests at least 3 working days before the start date so roster coverage can be arranged.",
    description_my:
      "နှစ်စဉ်ခွင့်အတွက် အနည်းဆုံး ၃ ရက်ကြိုတင်လျှောက်ထားရမည်။ လုပ်ငန်းအဖွဲ့ အစားထိုးစီစဉ်နိုင်ရန် လိုအပ်သည်။",
  },
  {
    key: "sick_evidence",
    is_enabled: true,
    is_enforced: true,
    is_custom: false,
    label_en: "Sick leave medical evidence",
    label_my: "နာမကျန်းခွင့် ဆေးမှတ်တမ်း",
    description_en:
      "Sick leave of 2 or more consecutive days requires a medical note or clinic certificate attached to the request.",
    description_my:
      "၂ ရက်နှင့်အထက် ဆက်တိုက် နာမကျန်းခွင့်အတွက် ဆေးမှတ်တမ်း သို့မဟုတ် ဆေးလက်မှတ် ပူးတွဲတင်ရမည်။",
  },
  {
    key: "handover",
    is_enabled: true,
    is_enforced: false,
    is_custom: false,
    label_en: "Duty handover before leave",
    label_my: "ခွင့်မယူမီ လုပ်ငန်းလွှဲပြောင်းခြင်း",
    description_en:
      "Before leave starts, write a short handover note covering open patients, pending tasks, and who will cover your shift.",
    description_my:
      "ခွင့်မယူမီ လက်ရှိလူနာများ၊ မပြီးသေးသောအလုပ်များနှင့် အစားထိုးတာဝန်ယူမည့်သူကို လုပ်ငန်းလွှဲပြောင်း မှတ်စု ရေးသားရမည်။",
  },
  {
    key: "emergency",
    is_enabled: true,
    is_enforced: false,
    is_custom: false,
    label_en: "Emergency leave follow-up",
    label_my: "အရေးပေါ်ခွင့် နောက်ဆက်တွဲ",
    description_en:
      "Emergency leave may be submitted first; supporting documents should be uploaded within 2 working days after return.",
    description_my:
      "အရေးပေါ်ခွင့်ကို ဦးစွာတင်ပြနိုင်ပြီး ပြန်ရောက်ပြီးနောက် ၂ ရက်အတွင်း အထောက်အထား ဖြည့်သွင်းရမည်။",
  },
  {
    key: "peak_roster",
    is_enabled: true,
    is_enforced: true,
    is_custom: false,
    label_en: "Peak clinic day restriction",
    label_my: "လူနာများသောနေ့များတွင် ကန့်သတ်ချက်",
    description_en:
      "Annual or unpaid leave on known peak OPD days (Monday mornings and public-holiday eves) needs HR manager approval.",
    description_my:
      "လူနာများသော OPD နေ့များ (တနင်္လာမနက်နှင့် အစိုးရရုံးပိတ်ရက်အကြို) တွင် နှစ်စဉ်/လစာမဲ့ခွင့်အတွက် HR မန်နေဂျာ အတည်ပြုချက် လိုအပ်သည်။",
  },
  {
    key: "same_department_cap",
    is_enabled: false,
    is_enforced: true,
    is_custom: false,
    label_en: "Same-department overlap limit",
    label_my: "ဌာနတူ ခွင့်ထပ်ခြင်း ကန့်သတ်ချက်",
    description_en:
      "No more than two staff from the same department may take approved leave on the same calendar day unless coverage is confirmed.",
    description_my:
      "ဌာနတူ ဝန်ထမ်း နှစ်ဦးထက်ပို၍ တစ်နေ့တည်းတွင် အတည်ပြုခွင့်ယူ၍ မရပါ။ အစားထိုးတာဝန် အတည်ပြုမှသာ ခြွင်းချက် ခွင့်ပြုသည်။",
  },
  {
    key: "unpaid_balance",
    is_enabled: true,
    is_enforced: false,
    is_custom: true,
    label_en: "Unpaid leave after balance used",
    label_my: "ခွင့်လက်ကျန် ကုန်ပြီးနောက် လစာမဲ့ခွင့်",
    description_en:
      "After annual and casual balances are used, further personal leave should be requested as unpaid leave with a clear reason.",
    description_my:
      "နှစ်စဉ်နှင့် ရိုးရိုးခွင့်လက်ကျန် ကုန်ပြီးနောက် ကိုယ်ရေးခွင့်များကို လစာမဲ့ခွင့်အဖြစ် အကြောင်းပြချက်နှင့်အတူ တင်ပြရမည်။",
  },
];

export default function HrLeaveRulesPage() {
  const { pushToast } = useToastStore();
  const navigate = useNavigate();
  const location = useLocation();
  const workspacePrefix = location.pathname.startsWith("/owner")
    ? "/owner"
    : "/admin";
  const [rules, setRules] = useState(SAMPLE_LEAVE_RULES);
  const [language, setLanguage] = useState("my");
  const [saving, setSaving] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState(emptyRuleForm);
  const [savingRule, setSavingRule] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);

  const enabledCount = useMemo(
    () => rules.filter((rule) => rule.is_enabled).length,
    [rules],
  );

  const load = useCallback(async () => {
    try {
      const res = await getLeaveRules();
      const nextRules = Array.isArray(res?.data) ? res.data : [];
      setRules(nextRules.length ? nextRules : SAMPLE_LEAVE_RULES);
    } catch (error) {
      setRules(SAMPLE_LEAVE_RULES);
      pushToast({
        message: resolveApiError(error, "Failed to load leave rules."),
        severity: "error",
      });
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const saveRules = async (nextRules) => {
    setSaving(true);
    try {
      const res = await updateLeaveRules({
        rules: nextRules.map((rule) => ({
          key: rule.key,
          is_enabled: Boolean(rule.is_enabled),
        })),
      });
      setRules(res.data || []);
      pushToast({ message: "Leave rules updated.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to update leave rules."),
        severity: "error",
      });
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = (key) => {
    const nextRules = rules.map((rule) =>
      rule.key === key ? { ...rule, is_enabled: !rule.is_enabled } : rule,
    );
    setRules(nextRules);
    saveRules(nextRules);
  };

  const openCreateDialog = () => {
    setEditingRule(null);
    setRuleForm(emptyRuleForm);
    setRuleDialogOpen(true);
  };

  const openEditDialog = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      label_en: rule.label_en || "",
      label_my: rule.label_my || "",
      description_en: rule.description_en || "",
      description_my: rule.description_my || "",
      is_enabled: Boolean(rule.is_enabled),
    });
    setRuleDialogOpen(true);
  };

  const closeRuleDialog = () => {
    if (savingRule) return;
    setRuleDialogOpen(false);
    setEditingRule(null);
    setRuleForm(emptyRuleForm);
  };

  const updateRuleFormField = (field) => (event) => {
    const value =
      field === "is_enabled" ? event.target.checked : event.target.value;
    setRuleForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveRuleForm = async () => {
    const payload = {
      label_en: ruleForm.label_en.trim(),
      label_my: ruleForm.label_my.trim(),
      description_en: ruleForm.description_en.trim(),
      description_my: ruleForm.description_my.trim(),
      is_enabled: Boolean(ruleForm.is_enabled),
    };
    if (
      !payload.label_en ||
      !payload.label_my ||
      !payload.description_en ||
      !payload.description_my
    ) {
      pushToast({
        message: "Fill in both labels and descriptions before saving.",
        severity: "warning",
      });
      return;
    }

    setSavingRule(true);
    try {
      const res = editingRule
        ? await updateLeaveRule(editingRule.key, payload)
        : await createLeaveRule(payload);
      const savedRule = res.data;
      setRules((prev) =>
        editingRule
          ? prev.map((rule) => (rule.key === savedRule.key ? savedRule : rule))
          : [...prev, savedRule],
      );
      pushToast({
        message: editingRule ? "Leave rule updated." : "Leave rule created.",
        severity: "success",
      });
      setRuleDialogOpen(false);
      setEditingRule(null);
      setRuleForm(emptyRuleForm);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save leave rule."),
        severity: "error",
      });
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (rule) => {
    const confirmed = window.confirm(
      `Delete "${rule.label_en}" from leave rules?`,
    );
    if (!confirmed) return;

    setDeletingKey(rule.key);
    try {
      const res = await deleteLeaveRule(rule.key);
      setRules(res.data || []);
      pushToast({ message: "Leave rule deleted.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to delete leave rule."),
        severity: "error",
      });
    } finally {
      setDeletingKey(null);
    }
  };

  const labelKey = language === "my" ? "label_my" : "label_en";
  const descriptionKey =
    language === "my" ? "description_my" : "description_en";

  return (
    <HrPageShell title="HR Module" subtitle="Leave rules">
      <Stack spacing={2}>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`${workspacePrefix}/hr/daily/leaves`)}
          sx={{ alignSelf: "flex-start" }}
        >
          Back
        </Button>

        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1.5}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Leave Request Rules{" "}
                <Chip size="small" label={`${enabledCount} active rules`} />
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enable rules that should be applied to future staff leave
                requests.
              </Typography>
            </Box>
            <Stack
              direction={"row"}
              spacing={1}
              flexWrap="wrap"
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <ToggleButtonGroup
                size="small"
                exclusive
                value={language}
                onChange={(_, nextLanguage) => {
                  if (nextLanguage) setLanguage(nextLanguage);
                }}
              >
                <ToggleButton value="my">မြန်မာ</ToggleButton>
                <ToggleButton value="en">English</ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={openCreateDialog}
              >
                New Rule
              </Button>
            </Stack>
          </Stack>
        </Card>

        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            },
          }}
        >
          {rules.map((rule) => (
            <Card
              key={rule.key}
              variant="outlined"
              sx={{
                p: 1.5,
                borderColor: rule.is_enabled ? "primary.main" : "divider",
                bgcolor: rule.is_enabled ? "action.hover" : "background.paper",
              }}
            >
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700 }}
                      gutterBottom
                    >
                      {rule[labelKey]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rule[descriptionKey]}
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Tooltip title="Edit rule">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(rule)}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete rule">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={deletingKey === rule.key}
                          onClick={() => deleteRule(rule)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(rule.is_enabled)}
                          disabled={saving}
                          onChange={() => toggleRule(rule.key)}
                        />
                      }
                      label=""
                      sx={{ m: 0 }}
                    />
                  </Stack>
                </Stack>

                <Divider />

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      {language === "my" ? rule.label_en : rule.label_my}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {rule.is_enforced
                        ? "Enforced automatically during leave submission"
                        : "Policy note shown to staff"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={rule.is_custom ? "Custom" : "System"}
                    />
                    <Chip
                      size="small"
                      color={rule.is_enabled ? "success" : "default"}
                      variant={rule.is_enabled ? "filled" : "outlined"}
                      label={rule.is_enabled ? "Active" : "Off"}
                    />
                  </Stack>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Box>
      </Stack>

      <Dialog
        open={ruleDialogOpen}
        onClose={closeRuleDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingRule ? "Edit leave rule" : "Create leave rule"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {!editingRule && (
              <Alert severity="info">
                Custom rules are shown to staff as HR policy notes. Only system
                rules are enforced automatically during leave submission.
              </Alert>
            )}
            {editingRule && !editingRule.is_enforced && (
              <Alert severity="info">
                This custom rule is a policy note and will not block submissions
                automatically.
              </Alert>
            )}
            <TextField
              label="English label"
              value={ruleForm.label_en}
              onChange={updateRuleFormField("label_en")}
              fullWidth
              required
            />
            <TextField
              label="Myanmar label"
              value={ruleForm.label_my}
              onChange={updateRuleFormField("label_my")}
              fullWidth
              required
            />
            <TextField
              label="English description"
              value={ruleForm.description_en}
              onChange={updateRuleFormField("description_en")}
              fullWidth
              multiline
              minRows={3}
              required
            />
            <TextField
              label="Myanmar description"
              value={ruleForm.description_my}
              onChange={updateRuleFormField("description_my")}
              fullWidth
              multiline
              minRows={3}
              required
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(ruleForm.is_enabled)}
                  onChange={updateRuleFormField("is_enabled")}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRuleDialog} disabled={savingRule}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveRuleForm}
            disabled={savingRule}
          >
            {editingRule ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}
