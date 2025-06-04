import { useState, useCallback, useEffect } from 'react';
import { Box, Paper, Button } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { AuthModelEditor } from '../AuthModelEditor/AuthModelEditor';
import { AuthModelGraph } from '../AuthModelGraph/AuthModelGraph';
import { OpenFGAService } from '../../services/OpenFGAService';
import { parseAuthModelToGraph } from '../../utils/authModelParser';
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
  const [isExpanded, setIsExpanded] = useState(false);

  // Initialize nodes and edges when component mounts
  useEffect(() => {
    try {
      const { nodes: initialNodes, edges: initialEdges } = parseAuthModelToGraph(initialModel);
      console.log('Initial nodes:', initialNodes);
      console.log('Initial edges:', initialEdges);
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
      console.log('Updated nodes:', newNodes);
      console.log('Updated edges:', newEdges);
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
      // Try to parse the current model and convert it to JSON
      const modelObj = JSON.parse(authModel);
      const jsonStr = JSON.stringify(modelObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
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
      // If it's not valid JSON, it might be in DSL format
      // You could add conversion logic here if needed
    }
  };

  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: isExpanded ? '1fr' : '1fr 1fr', 
      gap: 2,
      height: '100%',
      minHeight: '700px'
    }}>
      <Box>
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
            <Button onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? 'Show Graph' : 'Expand Editor'}
            </Button>
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <AuthModelEditor value={authModel} onChange={handleAuthModelChange} />
          </Box>
        </Paper>
      </Box>
      {!isExpanded && (
        <Box>
          <Paper sx={{ p: 2, height: '100%' }}>
            <AuthModelGraph
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
            />
          </Paper>
        </Box>
      )}
    </Box>
  );
};
