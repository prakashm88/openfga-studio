import { useState, useCallback, useEffect } from 'react';
import { Box, Paper, Button, IconButton, Snackbar, Alert, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { AuthModelEditor } from '../AuthModelEditor/AuthModelEditor';
import { AuthModelGraph } from '../AuthModelGraph/AuthModelGraph';
import { OpenFGAService } from '../../services/OpenFGAService';
import { parseAuthModelToGraph } from '../../utils/authModelParser';
import { dslToJson } from '../../utils/modelConverter';
import type { Node, Edge, NodeChange, EdgeChange } from 'reactflow';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';
import type { OpenFGAModel } from '../../types/models';
import { loadPlugins, MODEL_VIEW_ID } from '../../plugins/loader';
import { layoutGraph } from '../../plugins/layout';
import type { GraphView } from '../../plugins/types';

// Plugin views can fetch files, so they rebuild after a pause in typing instead of on each key.
const PLUGIN_VIEW_DELAY_MS = 300;

function toModelJson(model: string): OpenFGAModel | null {
  try {
    return model.trim().startsWith('{') ? JSON.parse(model) : dslToJson(model);
  } catch {
    return null;
  }
}

interface AuthModelTabProps {
  storeId: string;
  storeName: string;
  initialModel: string;
  onModelUpdate: (model: string) => void;
}

export default function AuthModelTab({ storeId, storeName, initialModel, onModelUpdate }: AuthModelTabProps) {
  const [authModel, setAuthModel] = useState(initialModel);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [leftPanelExpanded, setLeftPanelExpanded] = useState(true);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [graphViews, setGraphViews] = useState<GraphView[]>([]);
  const [pluginErrors, setPluginErrors] = useState<string[]>([]);
  const [selectedViewId, setSelectedViewId] = useState(MODEL_VIEW_ID);
  const [viewError, setViewError] = useState<string | null>(null);
  const [rebuildCount, setRebuildCount] = useState(0);

  useEffect(() => {
    setAuthModel(initialModel);
  }, [initialModel]);

  useEffect(() => {
    let active = true;
    loadPlugins().then(({ graphViews: loadedViews, errors }) => {
      if (active) {
        setGraphViews(loadedViews);
        setPluginErrors(errors);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const view = graphViews.find((candidate) => candidate.id === selectedViewId);
    setViewError(null);
    if (!view) {
      try {
        const { nodes: newNodes, edges: newEdges } = parseAuthModelToGraph(authModel, storeName);
        setNodes(newNodes);
        setEdges(newEdges);
      } catch (error) {
        console.error('Failed to parse auth model:', error);
      }
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await view.build({ model: authModel, modelJson: toModelJson(authModel), storeId, storeName });
        if (active) {
          setNodes(layoutGraph(result.nodes, result.edges));
          setEdges(result.edges);
        }
      } catch (error) {
        console.error(`The graph view ${view.id} failed:`, error);
        if (active) {
          setViewError(`${view.label}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }, PLUGIN_VIEW_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [authModel, storeId, storeName, graphViews, selectedViewId, rebuildCount]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const handleAuthModelChange = (value: string) => {
    setAuthModel(value);
  };

  const handleSave = async () => {
    try {
      await OpenFGAService.writeAuthorizationModel(storeId, authModel);
      onModelUpdate(authModel);
      setSnackbar({
        open: true,
        message: 'Authorization model saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to save authorization model:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save authorization model',
        severity: 'error'
      });
    }
  };

  const handleDownloadJSON = () => {
    try {
      let jsonContent = authModel;
      if (!authModel.startsWith('{')) {
        // Convert DSL to JSON for download
        const jsonModel = dslToJson(authModel);
        jsonContent = JSON.stringify(jsonModel, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'authorization-model.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'authorization-model.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download JSON:', error);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 2,
      height: '100%',
      position: 'relative',
      width: '100%',
      px: 2,
      pb: 2
    }}>
      <Box sx={{ 
        flex: leftPanelExpanded ? 1 : 'none',
        display: leftPanelExpanded ? 'flex' : 'none',
        flexDirection: 'column',
        minWidth: leftPanelExpanded ? '400px' : 0
      }}>
        <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleSave}>
                Save Model
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<FileDownloadIcon />}
                onClick={handleDownloadJSON}
              >
              JSON
              </Button>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <AuthModelEditor value={authModel} onChange={handleAuthModelChange} />
          </Box>
        </Paper>
      </Box>

      <IconButton 
        onClick={() => setLeftPanelExpanded(!leftPanelExpanded)}
        sx={{ 
          position: 'absolute',
          left: leftPanelExpanded ? 'calc(50% - 20px)' : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        {leftPanelExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </IconButton>

      <Box sx={{ 
        flex: rightPanelExpanded ? 1 : 'none',
        display: rightPanelExpanded ? 'flex' : 'none',
        minWidth: rightPanelExpanded ? '400px' : 0
      }}>
        <Paper sx={{ p: 2, height: '100%', width: '100%' }}>
          {graphViews.length > 0 && (
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={selectedViewId}
                onChange={(_, value: string | null) => {
                  if (value) {
                    // Start the new view empty, so that React Flow fits the viewport to its nodes, not the old ones.
                    setNodes([]);
                    setEdges([]);
                    setSelectedViewId(value);
                  }
                }}
              >
                <ToggleButton value={MODEL_VIEW_ID}>Model</ToggleButton>
                {graphViews.map((view) => (
                  <ToggleButton key={view.id} value={view.id}>{view.label}</ToggleButton>
                ))}
              </ToggleButtonGroup>
              {selectedViewId !== MODEL_VIEW_ID && (
                <Tooltip title="Rebuild graph">
                  <IconButton size="small" onClick={() => setRebuildCount((count) => count + 1)}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
          {pluginErrors.map((error) => (
            <Alert key={error} severity="warning" sx={{ mb: 1 }}>Plugin failed to load: {error}</Alert>
          ))}
          {viewError && <Alert severity="error" sx={{ mb: 1 }}>{viewError}</Alert>}
          <AuthModelGraph
            // React Flow fits the viewport only once per mount, so each view gets a new mount.
            key={selectedViewId}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
          />
        </Paper>
      </Box>

      <IconButton 
        onClick={() => setRightPanelExpanded(!rightPanelExpanded)}
        sx={{ 
          position: 'absolute',
          right: rightPanelExpanded ? 16 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        {rightPanelExpanded ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </IconButton>
      <Snackbar 
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
