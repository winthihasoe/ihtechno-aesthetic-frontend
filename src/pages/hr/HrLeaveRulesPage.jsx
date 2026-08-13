import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import HrPageShell from "./components/HrPageShell";
import { getLeaveRules, updateLeaveRules } from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";

/** Demo leave-request rules shown when the API returns no rule list. */
const SAMPLE_LEAVE_RULES = [
  {
    key: "annual_notice",
    is_enabled: true,
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
  const [rules, setRules] = useState(SAMPLE_LEAVE_RULES);
  const [language, setLanguage] = useState("my");
  const [saving, setSaving] = useState(false);

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

  const toggleRule = (key) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.key === key ? { ...rule, is_enabled: !rule.is_enabled } : rule,
      ),
    );
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      const res = await updateLeaveRules({
        rules: rules.map((rule) => ({
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
    } finally {
      setSaving(false);
    }
  };

  const labelKey = language === "my" ? "label_my" : "label_en";
  const descriptionKey = language === "my" ? "description_my" : "description_en";

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Leave rules"
      guide={[
        "Set the annual, sick and casual leave entitlements that govern staff leave requests.",
        "Changes apply to future leave-balance calculations.",
      ]}
    >
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1.5}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Leave Request Rules
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enable rules that should be applied to future staff leave requests.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
              <Chip size="small" label={`${enabledCount} active rules`} />
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
              <Button variant="contained" disabled={saving} onClick={saveRules}>
                Save Rules
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
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {rule[labelKey]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rule[descriptionKey]}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(rule.is_enabled)}
                        onChange={() => toggleRule(rule.key)}
                      />
                    }
                    label=""
                    sx={{ m: 0 }}
                  />
                </Stack>

                <Divider />

                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography variant="caption" color="text.secondary">
                    {language === "my" ? rule.label_en : rule.label_my}
                  </Typography>
                  <Chip
                    size="small"
                    color={rule.is_enabled ? "success" : "default"}
                    variant={rule.is_enabled ? "filled" : "outlined"}
                    label={rule.is_enabled ? "Active" : "Off"}
                  />
                </Stack>
              </Stack>
            </Card>
          ))}
        </Box>
      </Stack>
    </HrPageShell>
  );
}
