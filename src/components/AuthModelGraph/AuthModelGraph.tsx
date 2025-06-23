import { useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls,
  ReactFlowProvider,
  useReactFlow,
  getRectOfNodes,
  getTransformForBounds,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  ConnectionLineType,
  Panel,
  MarkerType
} from 'reactflow';
import { useTheme, IconButton, Tooltip } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { toPng } from 'html-to-image';
import { CustomNode } from './CustomNode';
import { useMemo } from 'react';
import 'reactflow/dist/style.css';

// Move nodeTypes outside component and memoize
const NODE_TYPES = {
  default: CustomNode,
} as const;

interface AuthModelGraphProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
}

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: false,
  style: {
    strokeWidth: 2,
    strokeDasharray: '0',
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
  }
};

const DownloadButton = () => {
  const { getNodes } = useReactFlow();
  const theme = useTheme();

  const downloadImage = useCallback(async () => {
    const flow = document.querySelector('.react-flow') as HTMLElement;
    if (!flow) return;

    const nodes = getNodes();
    const nodesBounds = getRectOfNodes(nodes);
    const transform = getTransformForBounds(nodesBounds, nodesBounds.width, nodesBounds.height, 0.5, 2);

    const options = {
      backgroundColor: theme.palette.background.default,
      height: nodesBounds.height + 80,
      width: nodesBounds.width + 80,
      style: {
        transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
      },
    };

    try {
      const dataUrl = await toPng(flow, options);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'authorization-model-graph.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download graph:', error);
    }
  }, [getNodes, theme.palette.background.default]);

  return (
    <Tooltip title="Download Graph as PNG" arrow>
      <IconButton 
        onClick={downloadImage}
        sx={{ 
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          width: 44,
          height: 44,
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 4px 12px rgba(121, 237, 131, 0.3)' 
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(19, 21, 25, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { 
            bgcolor: theme.palette.action.hover,
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main,
            transform: 'translateY(-2px)',
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 6px 16px rgba(121, 237, 131, 0.4)' 
              : '0 6px 16px rgba(0, 0, 0, 0.15)',
          }
        }}
      >
        <FileDownloadIcon />
      </IconButton>
    </Tooltip>
  );
};

export const AuthModelGraph = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}: AuthModelGraphProps) => {
  const theme = useTheme();

  // Memoize styles based on theme
  const styles = useMemo(() => ({
    background: theme.palette.background.default,
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    overflow: 'hidden'
  }), [theme.palette.background.default]);

  const controlsStyle = useMemo(() => ({
    backgroundColor: theme.palette.background.paper,
    borderColor: theme.palette.divider,
    borderRadius: '6px',
    padding: '4px',
    button: {
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      borderRadius: '4px',
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      },
    },
  }), [
    theme.palette.background.paper,
    theme.palette.divider,
    theme.palette.text.primary,
    theme.palette.action.hover
  ]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      minHeight: '500px',
      maxHeight: 'calc(100vh - 200px)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ 
            padding: 0.1,
            duration: 1000,
            maxZoom: 1.5,
            minZoom: 0.3
          }}
          minZoom={0.1}
          maxZoom={3}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          zoomOnDoubleClick={false}
          style={styles}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineType={ConnectionLineType.SmoothStep}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
          nodesFocusable={false}
          elementsSelectable={true}
          attributionPosition="bottom-right"
        >
          <Background 
            color={theme.palette.mode === 'dark' ? 'rgba(121, 237, 131, 0.08)' : 'rgba(121, 237, 131, 0.04)'}
            gap={20}
            size={1}
            style={{
              backgroundColor: theme.palette.background.default
            }}
          />
          <Controls 
            style={{
              ...controlsStyle,
              bottom: 80, // Move controls up to avoid overlap with legend
              right: 16,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 4px 12px rgba(121, 237, 131, 0.3)' 
                : '0 4px 12px rgba(0, 0, 0, 0.1)',
              button: {
                ...controlsStyle.button,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                border: `1px solid ${theme.palette.divider}`,
                fontSize: '16px',
                width: '32px',
                height: '32px',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                },
              },
            }}
            showInteractive={false}
            position="bottom-right"
          />
          <Panel position="top-right" style={{ marginTop: '12px', marginRight: '12px' }}>
            <DownloadButton />
          </Panel>
          <Panel position="bottom-left" style={{ 
            marginBottom: '12px', 
            marginLeft: '12px',
            zIndex: 10 
          }}>
            <div style={{ 
              padding: '12px 16px',
              background: theme.palette.background.paper,
              borderRadius: '12px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              fontSize: '14px',
              fontWeight: 500,
              color: theme.palette.text.primary,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 4px 12px rgba(121, 237, 131, 0.3)' 
                : '0 4px 12px rgba(0, 0, 0, 0.1)',
              maxWidth: 'calc(100vw - 200px)',
              width: 'auto',
              border: `1px solid ${theme.palette.divider}`,
              backdropFilter: 'blur(10px)',
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(19, 21, 25, 0.95)' 
                : 'rgba(255, 255, 255, 0.95)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 'fit-content' }}>
                <div style={{ 
                  width: 16, 
                  height: 16, 
                  borderRadius: '6px', 
                  background: theme.palette.mode === 'dark' ? theme.palette.primary.dark : '#e3f2fd',
                  border: `2px solid ${theme.palette.primary.main}`,
                  boxShadow: `0 2px 4px ${theme.palette.primary.main}40`
                }}></div>
                <strong>Type</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 'fit-content' }}>
                <div style={{ 
                  width: 16, 
                  height: 16, 
                  borderRadius: '6px', 
                  background: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#f5f5f5',
                  border: `2px solid ${theme.palette.grey[600]}`,
                  boxShadow: `0 2px 4px ${theme.palette.grey[600]}40`
                }}></div>
                <strong>Relation</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 'fit-content' }}>
                <div style={{ 
                  width: 16, 
                  height: 16, 
                  borderRadius: '6px', 
                  background: theme.palette.mode === 'dark' ? theme.palette.success.dark : '#f1f8e9',
                  border: `2px solid ${theme.palette.success.main}`,
                  boxShadow: `0 2px 4px ${theme.palette.success.main}40`
                }}></div>
                <strong>Definition</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 'fit-content' }}>
                <div style={{ 
                  width: 16, 
                  height: 16, 
                  borderRadius: '6px', 
                  background: theme.palette.mode === 'dark' ? '#fff3e0' : '#fff3e0',
                  border: `2px solid #ff9800`,
                  boxShadow: '0 2px 4px #ff980040'
                }}></div>
                <strong>Condition</strong>
              </span>
            </div>
          </Panel>
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};
