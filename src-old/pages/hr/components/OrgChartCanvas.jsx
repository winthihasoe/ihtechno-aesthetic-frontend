import { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, useTheme } from "@mui/material";
import OrgChartNode from "./OrgChartNode";

const nodeTypes = { orgChart: OrgChartNode };

function OrgChartCanvasInner({
  nodes,
  edges,
  highlightedNodeId = null,
  onNodeClick,
  fitViewKey = 0,
}) {
  const theme = useTheme();
  const { fitView, setCenter, getNode } = useReactFlow();

  const styledNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: highlightedNodeId != null && node.id === highlightedNodeId,
      })),
    [nodes, highlightedNodeId],
  );

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        animated: false,
        style: {
          stroke:
            theme.palette.mode === "dark"
              ? theme.palette.primary.light
              : theme.palette.primary.main,
          strokeWidth: 1.5,
          opacity: 0.45,
        },
      })),
    [edges, theme],
  );

  const layoutSignature = useMemo(
    () =>
      `${nodes.map((node) => node.id).join("|")}::${edges.map((edge) => edge.id).join("|")}`,
    [nodes, edges],
  );

  useEffect(() => {
    if (!nodes.length) return;
    const timer = window.setTimeout(() => {
      fitView({ padding: 0.25, duration: 400 });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [fitView, fitViewKey, layoutSignature]);

  useEffect(() => {
    if (!highlightedNodeId) return;
    const node = getNode(highlightedNodeId);
    if (!node) return;
    setCenter(node.position.x + 114, node.position.y + 54, {
      zoom: 1.1,
      duration: 350,
    });
  }, [getNode, highlightedNodeId, setCenter]);

  const handleNodeClick = useCallback(
    (_event, node) => {
      if (node.data?.isVirtual || node.data?.isSyntheticManager) return;
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  return (
    <ReactFlow
      key={layoutSignature}
      nodes={styledNodes}
      edges={styledEdges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      zoomOnScroll
      minZoom={0.25}
      maxZoom={1.75}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1} color={theme.palette.divider} />
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  );
}

export default function OrgChartCanvas(props) {
  return (
    <Box
      sx={(theme) => ({
        width: "100%",
        height: "100%",
        minHeight: 480,
        borderRadius: 2,
        overflow: "hidden",
        border: 5,
        borderColor: "divider",
        bgcolor: "background.paper",
        "& .react-flow__controls": {
          zIndex: 1000,
          boxShadow: theme.shadows[2],
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          overflow: "hidden",
        },
        "& .react-flow__controls-button": {
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          fill: theme.palette.primary.main,
          color: theme.palette.primary.main,
          width: 28,
          height: 28,
          "&:hover": {
            backgroundColor: theme.palette.primary.main,
          },
          "&:hover svg": {
            fill: theme.palette.primary.contrastText,
          },
          "& svg": {
            fill: theme.palette.primary.main,
            maxWidth: 14,
            maxHeight: 14,
          },
        },
        "& .react-flow__controls-button:last-child": {
          borderBottom: "none",
        },
      })}
    >
      <ReactFlowProvider>
        <OrgChartCanvasInner {...props} />
      </ReactFlowProvider>
    </Box>
  );
}
