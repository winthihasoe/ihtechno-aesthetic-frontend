# Guided empty state (UI style guide)

Use this pattern on **list/report pages** when the main dataset is empty after loading — not when filters hide rows but other data exists on the page.

**Reference implementations**

| Page | File |
|------|------|
| Batch recalls | `src/pages/inventory/BatchRecallsPage.jsx` |
| Equipment consumables | `src/pages/inventory/EquipmentConsumablesPage.jsx` |
| Consignment report | `src/pages/inventory/ConsignmentReportPage.jsx` |
| Suppliers | `src/pages/inventory/SuppliersPage.jsx` |

---

## When to use

- First-use / zero-data: nothing has been created or received yet.
- Genuinely empty report: no rows match the page’s default scope (not a transient filter).

## When not to use

- **Filtered empty table** while the page normally has data — keep a single row inside the table: “No results match your filters.”
- **Partial empty** (e.g. one tab empty, another has rows) — empty state only for the empty section, or inline copy.
- **Error state** — use `Alert`, not the guided empty state.
- **Loading** — use `LoadingIndicator` only (see `.cursor/rules/loading-indicator.mdc`).

---

## Page layout

```
┌─────────────────────────────────────────────┐
│  Title + short description (always visible) │  ← page header
│  [Primary action]  (only when rows.length>0)│
├─────────────────────────────────────────────┤
│  Filters / toolbar (optional)               │
├─────────────────────────────────────────────┤
│  loading → centered LoadingIndicator (112)    │
│  empty   → Guided empty state panel         │
│  data    → totals (optional) + table         │
└─────────────────────────────────────────────┘
```

### Header

- **Title:** `Typography variant="h5" fontWeight={700}`
- **Description:** `variant="body2" color="text.secondary"` with `mt: 0.5`, `maxWidth: 640`, `lineHeight: 1.65`
- **Header primary action** (Add, etc.): show only when `rows.length > 0` (or equivalent). Duplicate the CTA inside the empty state for first-time users.

### Content branching

```jsx
{loading ? (
  <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
    <LoadingIndicator size={112} />
  </Box>
) : rows.length === 0 ? (
  /* Guided empty state */
) : (
  /* Table / main content */
)}
```

---

## Guided empty state structure

Four blocks inside one outer `Paper`:

1. **Hero** — icon, title, body, optional CTA button  
2. **Step cards** — 3 cards from `EMPTY_STEPS`  
3. **Footer hint** — link to related page or read-only note for users without manage permission  

### Accent color

| Context | Palette | Example |
|---------|---------|---------|
| Default / operational | `primary` | Suppliers, consignment, equipment |
| Risk / compliance | `warning` | Batch recalls |

Use `alpha(theme.palette.<accent>.main, …)` for panel and icon-circle backgrounds (see template below).

### Icon

- MUI **Outlined** icons, `fontSize: 36` inside a **72×72** circle.
- Pick one icon that represents the page (e.g. `BusinessOutlinedIcon` for suppliers).

### Copy

| Element | Guidance |
|---------|----------|
| **Title** (`h6`) | Short, factual: “No suppliers yet”, “No consignment batches to show” |
| **Body** | 1–2 sentences: what this page is for + what unlocks data |
| **CTA** | Verb-first: “Add first supplier”, “Open settlement” — only if user can act |
| **Step cards** | Exactly **3** steps, workflow order, each `title` + one-sentence `body` |
| **Footer** | Where to go next; use `RouterLink` for in-app paths |

Build role-aware paths with `resolveUserPrimaryRole(user)` from `src/utils/workspaceRoutes.js`.

---

## `EMPTY_STEPS` convention

Define at module top:

```jsx
const EMPTY_STEPS = [
  {
    icon: StorefrontOutlinedIcon,
    title: "Step one title",
    body: "One sentence explaining the first action in the workflow.",
  },
  {
    icon: LocalShippingOutlinedIcon,
    title: "Step two title",
    body: "One sentence for the next step.",
  },
  {
    icon: PaymentsOutlinedIcon,
    title: "Step three title",
    body: "One sentence tying to finance or follow-up.",
  },
];
```

Map cards with `EMPTY_STEPS.map(({ icon: Icon, title, body }) => …)`.

---

## Style tokens (copy as-is)

### Outer panel

```jsx
<Paper
  variant="outlined"
  sx={{
    borderRadius: 2,
    overflow: "hidden",
    bgcolor: alpha(
      theme.palette.primary.main, // or .warning.main
      theme.palette.mode === "dark" ? 0.06 : 0.04,
    ),
  }}
>
```

### Hero section

```jsx
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
    <PageIcon sx={{ fontSize: 36, color: "primary.main" }} />
  </Box>
  <Typography variant="h6" fontWeight={700} color="text.primary" gutterBottom>
    {emptyTitle}
  </Typography>
  <Typography
    variant="body2"
    color="text.secondary"
    sx={{ maxWidth: 520, mx: "auto", lineHeight: 1.65 }}
  >
    {emptyBody}
  </Typography>
  {canAct && (
    <Button variant="contained" onClick={onPrimaryAction} sx={{ mt: 2.5 }}>
      {primaryCtaLabel}
    </Button>
  )}
</Box>
```

### Step cards row

```jsx
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
          <Box sx={{ mt: 0.25, color: "primary.main", display: "flex" }}>
            <Icon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
              {body}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    ))}
  </Stack>

  <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
    {/* Footer with RouterLink or permission-aware static text */}
  </Typography>
</Box>
```

### Footer link

```jsx
<Typography
  component={RouterLink}
  to={targetPath}
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
```

---

## Required imports

```jsx
import { Link as RouterLink } from "react-router-dom";
import { alpha, useTheme } from "@mui/material/styles";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";
import { resolveUserPrimaryRole } from "../../utils/workspaceRoutes";
```

Adjust relative paths for file depth.

---

## Implementation checklist

- [ ] Page header always shows title + short description  
- [ ] Header primary action hidden when list is empty  
- [ ] `loading` → `LoadingIndicator` `size={112}`, centered, `py: 8`  
- [ ] Empty → full guided panel replaces table (not an empty table row)  
- [ ] `EMPTY_STEPS` has exactly 3 workflow steps with outlined icons  
- [ ] CTA in empty state respects permissions (`canManage`, etc.)  
- [ ] Footer link uses role-prefixed route (`/${role}/…`)  
- [ ] Accent color matches page tone (`primary` vs `warning`)  
- [ ] No `CircularProgress` or plain “Loading…” text  

---

## Future: shared component

When several more pages adopt this pattern, extract a reusable component, e.g. `GuidedEmptyState.jsx`:

```jsx
<GuidedEmptyState
  accent="primary"
  icon={BusinessOutlinedIcon}
  title="No suppliers yet"
  description="…"
  primaryAction={canManage ? { label: "Add first supplier", onClick: openCreate } : null}
  steps={EMPTY_STEPS}
  footer={…}
/>
```

Until then, copy the structure from a reference page and customize copy — keep tokens identical for visual consistency.
