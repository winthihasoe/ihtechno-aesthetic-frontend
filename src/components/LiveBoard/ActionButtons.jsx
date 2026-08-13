import { Box, Button, Stack, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PaymentIcon from "@mui/icons-material/Payment";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {
  canAccessPreparationPanel,
  canUseLiveboardButton,
} from "../../utils/roleUtils";
import useSettingsStore from "../../stores/settingsStore";

export default function ActionButtons({
  visit,
  user,
  onAction,
  disabled = false,
  disableMarkTreatmentDone = false,
  markTreatmentDoneDisabledReason = "",
}) {
  const { status } = visit;
  const liveboardRules = useSettingsStore((s) => s.settings?.liveboard_rules || {});

  const btn = (
    label,
    action,
    icon,
    color = "primary",
    variant = "contained",
    size = "small",
    isDisabled = disabled,
    disabledReason = "",
  ) => {
    const button = (
      <Button
        key={action}
        size={size}
        variant={variant}
        color={color}
        startIcon={icon}
        disabled={isDisabled}
        onClick={(event) => {
          event.stopPropagation();
          onAction(action, visit);
        }}
        data-testid={`visit-action-${action}`}
        sx={{ fontSize: 12, py: 0.5 }}
      >
        {label}
      </Button>
    );

    return isDisabled && disabledReason ? (
      <Tooltip key={action} title={disabledReason} arrow>
        <Box component="span" sx={{ display: "inline-flex" }}>
          {button}
        </Box>
      </Tooltip>
    ) : (
      button
    );
  };

  const buttons = [];

  if (status === "waiting" && canUseLiveboardButton(user, visit, "start_consulting", liveboardRules)) {
    buttons.push(
      btn(
        "Start Consultation",
        "start_consultation",
        null,
        "info",
      ),
    );
  }

  if (status === "waiting" && canUseLiveboardButton(user, visit, "do_not_consulting", liveboardRules)) {
    buttons.push(
      btn(
        "Do not consulting",
        "go_preparation",
        <NavigateNextIcon />,
        "secondary",
      ),
    );
  }

  if (status === "consulting") {
    if (canUseLiveboardButton(user, visit, "open_consulting", liveboardRules)) {
      buttons.push(
        btn(
          "Open Consultation",
          "open_consultation",
          null,
          "primary",
          "outlined",
        ),
      );
    }
    if (canUseLiveboardButton(user, visit, "do_not_consulting", liveboardRules)) {
      buttons.push(
        btn(
          "Do not consulting",
          "go_preparation",
          <NavigateNextIcon />,
          "secondary",
        ),
      );
    }
    if (canUseLiveboardButton(user, visit, "send_to_preparation", liveboardRules)) {
      buttons.push(
        btn(
          "Send to Pre-treatment",
          "send_to_preparation",
          null,
          "secondary",
        ),
      );
    }
  }

  if (status === "preparation") {
    if (canAccessPreparationPanel(user, visit)) {
      buttons.push(
        btn(
          "Open Pre-treatment",
          "open_preparation",
          null,
          "primary",
          "outlined",
        ),
      );
    }
    if (canUseLiveboardButton(user, visit, "proceed_treatment", liveboardRules)) {
      buttons.push(
        btn(
          "Proceed to Treatment",
          "proceed_to_treatment",
          null,
          "secondary",
        ),
      );
    }
  }

  if (status === "treatment" && canUseLiveboardButton(user, visit, "mark_done", liveboardRules)) {
    buttons.push(
      btn(
        "Mark Done",
        "mark_treatment_done",
        <CheckCircleIcon />,
        "success",
        "contained",
        "small",
        disabled || disableMarkTreatmentDone,
        markTreatmentDoneDisabledReason,
      ),
    );
  }

  if (status === "payment" && canUseLiveboardButton(user, visit, "go_to_invoice", liveboardRules)) {
    buttons.push(
      btn("Go to Invoice", "complete_payment", <PaymentIcon />, "error"),
    );
  }

  if (buttons.length === 0) return null;

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.75} mt={1}>
      {buttons}
    </Stack>
  );
}
