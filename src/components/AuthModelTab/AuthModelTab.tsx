import { useState } from 'react';
import { Box, Grid, Paper, Button } from '@mui/material';
import { AuthModelEditor } from '../AuthModelEditor/AuthModelEditor';
import { AuthModelGraph } from '../AuthModelGraph/AuthModelGraph';
import { OpenFGAService } from '../../services/OpenFGAService';
import { parseAuthModelToGraph } from '../../utils/authModelParser';

interface AuthModelTabProps {
  storeId: string;
  initialModel: string;
  onModelUpdate: (model: string) => void;
}

export const AuthModelTab = ({ storeId, initialModel, onModelUpdate }: AuthModelTabProps) => {
  const [authModel, setAuthModel] = useState(initialModel);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

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
      await OpenFGAService.writeAuthorizationModel(storeId, JSON.parse(authModel));
      onModelUpdate(authModel);
    } catch (error) {
      console.error('Failed to save authorization model:', error);
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={isExpanded ? 12 : 6}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="contained" onClick={handleSave}>
              Save Model
            </Button>
            <Button onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? 'Show Graph' : 'Expand Editor'}
            </Button>
          </Box>
          <AuthModelEditor value={authModel} onChange={handleAuthModelChange} />
        </Paper>
      </Grid>
      {!isExpanded && (
        <Grid item xs={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <AuthModelGraph
              nodes={nodes}
              edges={edges}
              onNodesChange={() => {}}
              onEdgesChange={() => {}}
            />
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};
