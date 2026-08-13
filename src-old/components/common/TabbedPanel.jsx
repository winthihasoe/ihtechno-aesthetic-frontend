import { Box, Card, Paper, Tab, Tabs } from "@mui/material";
import TabPanel from "./TabPanel";

const defaultTabsSx = {
  borderBottom: 1,
  borderColor: "divider",
  px: 1,
  "& .MuiTab-root": {
    textTransform: "none",
    minHeight: 40,
    fontWeight: 600,
    fontSize: 13,
  },
};

const WRAPPER_COMPONENTS = {
  none: Box,
  paper: Paper,
  card: Card,
};

export default function TabbedPanel({
  items = [],
  value,
  onChange,
  variant = "scrollable",
  scrollButtons = "auto",
  tabsSx,
  contentSx,
  panelSx,
  wrapper = "none",
  wrapperProps = {},
}) {
  const Wrapper = WRAPPER_COMPONENTS[wrapper] ?? Box;

  return (
    <Wrapper {...wrapperProps}>
      <Tabs
        value={value}
        onChange={(_, next) => onChange(next)}
        variant={variant}
        scrollButtons={scrollButtons}
        sx={{ ...defaultTabsSx, ...tabsSx }}
      >
        {items.map((item) => (
          <Tab key={item.label} label={item.label} />
        ))}
      </Tabs>

      <Box sx={contentSx}>
        {items.map((item, index) => (
          <TabPanel key={item.label} value={value} index={index} sx={panelSx}>
            {item.content}
          </TabPanel>
        ))}
      </Box>
    </Wrapper>
  );
}
