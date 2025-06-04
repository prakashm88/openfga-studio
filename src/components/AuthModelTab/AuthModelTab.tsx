import { useState, useCallback, useEffect } from 'react';
import { Box, Paper, Button, IconButton } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { AuthModelEditor } from '../AuthModelEditor/AuthModelEditor';
import { AuthModelGraph } from '../AuthModelGraph/AuthModelGraph';
import { OpenFGAService } from '../../services/OpenFGAService';
import { parseAuthModelToGraph } from '../../utils/authModelParser';
import { dslToJson } from '../../utils/modelConverter';
import type { Node, Edge, NodeChange, EdgeChange } from 'reactflow';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';

interface AuthModelTabProps {
  storeId: string;
  initialModel: string;
  onModelUpdate: (model: string) => void;
}

export const AuthModelTab = ({ storeId, initialModel, onModelUpdate }: AuthModelTabProps) => {
  const [authModel, setAuthModel] = useState(initialModel);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [leftPanelExpanded, setLeftPanelExpanded] = useState(true);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(true);

  useEffect(() => {
    setAuthModel(initialModel);
    try {
      const { nodes: initialNodes, edges: initialEdges } = parseAuthModelToGraph(initialModel);
      setNodes(initialNodes);
      setEdges(initialEdges);
    } catch (error) {
      console.error('Failed to parse initial auth model:', error);
    }
  }, [initialModel]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const handleAuthModelChange = (value: string) => {
    setAuthModel(value);
    try {
      const { nodes: newNodes, edges: newEdges } = parseAuthModelToGraph(value);
      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error) {
      console.error('Failed to parse auth model:', error);
    }
  };

  const handleSave = async () => {
    try {
      await OpenFGAService.writeAuthorizationModel(storeId, authModel);
      onModelUpdate(authModel);
    } catch (error) {
      console.error('Failed to save authorization model:', error);
    }
  };

  const handleDownloadJSON = () => {
    try {
      let jsonContent = authModel;
      if (!authModel.startsWith('{')) {
        // Convert DSL to JSON for download
        const jsonModel = dslToJson(authModel);
        jsonContent = JSON.stringify(jsonModel, null, 2);
      }
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'authorization-model.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
                Download JSON
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
          <AuthModelGraph
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
    </Box>
  );
};
