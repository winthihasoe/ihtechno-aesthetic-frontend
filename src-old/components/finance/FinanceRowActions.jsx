import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BlockIcon from "@mui/icons-material/Block";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { IconButton, Stack, Tooltip } from "@mui/material";

const VARIANTS = {
  edit: {
    icon: EditOutlinedIcon,
    label: "Edit",
    color: "primary",
  },
  delete: {
    icon: DeleteOutlineIcon,
    label: "Delete",
    color: "error",
  },
  void: {
    icon: BlockIcon,
    label: "Void",
    color: "error",
  },
  approve: {
    icon: CheckCircleOutlineIcon,
    label: "Approve",
    color: "success",
  },
  view: {
    icon: VisibilityOutlinedIcon,
    label: "View",
    color: "default",
  },
  save: {
    icon: CheckCircleOutlineIcon,
    label: "Save",
    color: "primary",
  },
};

export default function FinanceRowActions({ actions = [] }) {
  if (!actions.length) return null;

  return (
    <Stack direction="row" spacing={0.25} justifyContent="flex-end" alignItems="center">
      {actions.map((action) => {
        const config = VARIANTS[action.variant];
        if (!config) return null;
        const Icon = config.icon;
        const color = action.color ?? config.color;

        return (
          <Tooltip key={action.variant + (action.label ?? config.label)} title={action.label ?? config.label}>
            <span>
              <IconButton
                size="small"
                color={color}
                disabled={action.disabled}
                onClick={action.onClick}
                aria-label={action.label ?? config.label}
                sx={{ p: 0.5 }}
              >
                <Icon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
