import { useState, useEffect } from 'react';
import { Box, Paper, Grid, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import { TupleEditor } from '../TupleEditor/TupleEditor';
import { QueryRunner } from '../QueryRunner/QueryRunner';
import { OpenFGAService } from '../../services/OpenFGAService';

interface TuplesTabProps {
  storeId: string;
}

interface SavedQuery {
  timestamp: number;
  query: { user: string; relation: string; object: string };
}

export const TuplesTab = ({ storeId }: TuplesTabProps) => {
  const [tuples, setTuples] = useState<Array<{ user: string; relation: string; object: string }>>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [activeQueryTab, setActiveQueryTab] = useState(0);

  useEffect(() => {
    loadTuples();
    loadSavedQueries();
  }, [storeId]);

  const loadTuples = async () => {
    try {
      const response = await OpenFGAService.listTuples(storeId);
      setTuples(response.tuples);
    } catch (error) {
      console.error('Failed to load tuples:', error);
    }
  };

  const loadSavedQueries = () => {
    const saved = localStorage.getItem(`queries-${storeId}`);
    if (saved) {
      setSavedQueries(JSON.parse(saved));
    }
  };

  const handleTupleSubmit = async (tuple: { user: string; relation: string; object: string }) => {
    try {
      await OpenFGAService.writeTuple(storeId, tuple);
      await loadTuples();
    } catch (error) {
      console.error('Failed to write tuple:', error);
    }
  };

  const handleQueryCheck = async (query: { user: string; relation: string; object: string }) => {
    try {
      const result = await OpenFGAService.check(storeId, query);
      // Save query to history
      const newQuery: SavedQuery = { timestamp: Date.now(), query };
      const updatedQueries = [newQuery, ...savedQueries].slice(0, 10); // Keep last 10 queries
      setSavedQueries(updatedQueries);
      localStorage.setItem(`queries-${storeId}`, JSON.stringify(updatedQueries));
      return result;
    } catch (error) {
      console.error('Failed to check relationship:', error);
      return { allowed: false };
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <TupleEditor onSubmit={handleTupleSubmit} />
        </Paper>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Relation</TableCell>
                <TableCell>Object</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tuples.map((tuple, index) => (
                <TableRow key={index}>
                  <TableCell>{tuple.user}</TableCell>
                  <TableCell>{tuple.relation}</TableCell>
                  <TableCell>{tuple.object}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
      <Grid item xs={6}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeQueryTab} onChange={(_, newValue) => setActiveQueryTab(newValue)}>
              <Tab label="Query Runner" />
              <Tab label="History" />
            </Tabs>
          </Box>
          {activeQueryTab === 0 ? (
            <QueryRunner onCheck={handleQueryCheck} />
          ) : (
            <Box>
              {savedQueries.map((saved, index) => (
                <Box key={index} sx={{ mb: 2, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                  <Box sx={{ mb: 1, color: 'text.secondary' }}>
                    {new Date(saved.timestamp).toLocaleString()}
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleQueryCheck(saved.query)}
                  >
                    {`${saved.query.user} ${saved.query.relation} ${saved.query.object}`}
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};
