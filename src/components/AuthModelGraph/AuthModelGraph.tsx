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
    <Tooltip title="Download Graph">
      <IconButton 
        onClick={downloadImage}
        sx={{ 
          bgcolor: theme.palette.background.paper,
          boxShadow: 1,
          '&:hover': { bgcolor: theme.palette.action.hover }
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
    <div style={{ width: '100%', height: '800px', position: 'relative' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ 
            padding: 2,
            duration: 1000,
            maxZoom: 1.25,
            minZoom: 0.4
          }}
          minZoom={0.25}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
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
            color={theme.palette.mode === 'dark' ? '#555' : '#e0e0e0'}
            gap={24}
            size={1.5}
          />
          <Controls 
            style={controlsStyle}
            showInteractive={false}
            position="bottom-right"
          />
          <Panel position="top-right" style={{ marginTop: '8px', marginRight: '8px' }}>
            <DownloadButton />
          </Panel>
          <Panel position="bottom-left">
            <div style={{ 
              padding: '8px 12px',
              background: theme.palette.background.paper,
              borderRadius: '6px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '13px',
              color: theme.palette.text.secondary,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              maxWidth: '100%',
              width: 'auto',
              border: `1px solid ${theme.palette.divider}`
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: 14, 
                  height: 14, 
                  borderRadius: '4px', 
                  background: theme.palette.mode === 'dark' ? theme.palette.primary.dark : '#e3f2fd',
                  border: `2px solid ${theme.palette.primary.main}`
                }}></div>
                Type
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: 14, 
                  height: 14, 
                  borderRadius: '4px', 
                  background: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#f5f5f5',
                  border: `2px solid ${theme.palette.grey[600]}`
                }}></div>
                Relation
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: 14, 
                  height: 14, 
                  borderRadius: '4px', 
                  background: theme.palette.mode === 'dark' ? theme.palette.success.dark : '#f1f8e9',
                  border: `2px solid ${theme.palette.success.main}`
                }}></div>
                Definition
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: 14, 
                  height: 14, 
                  borderRadius: '4px', 
                  background: theme.palette.mode === 'dark' ? '#fff3e0' : '#fff3e0',
                  border: `2px solid #ff9800`
                }}></div>
                Condition
              </span>
            </div>
          </Panel>
          {/*Removing duplicate legends <Panel position="bottom-right" style={{ 
            marginBottom: '8px', 
            marginRight: '8px', 
            padding: '8px',
            background: theme.palette.background.paper,
            borderRadius: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: `1px solid ${theme.palette.divider}`
          }}>
            <Typography variant="subtitle2" style={{ marginBottom: '8px', color: theme.palette.text.primary }}>
              Legend
            </Typography>
            <LegendItem label="Type" color={theme.palette.mode === 'dark' ? theme.palette.primary.dark : '#e3f2fd'} />
            <LegendItem label="Relation" color={theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#f5f5f5'} />
            <LegendItem label="Definition" color={theme.palette.mode === 'dark' ? theme.palette.success.dark : '#f1f8e9'} />
          </Panel>*/}
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};
