import { TextField, Button, Box, Paper, Typography } from '@mui/material';
import { useState } from 'react';

interface QueryRunnerProps {
  onCheck: (query: { user: string; relation: string; object: string }) => Promise<{ allowed: boolean }>;
}

export const QueryRunner = ({ onCheck }: QueryRunnerProps) => {
  const [user, setUser] = useState('');
  const [relation, setRelation] = useState('');
  const [object, setObject] = useState('');
  const [result, setResult] = useState<{ allowed: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await onCheck({ user, relation, object });
      setResult(response);
    } catch (error) {
      console.error('Error running query:', error);
      setResult(null);
    }
  };

  return (
    <Box className="query-runner">
      <Box component="form" onSubmit={handleSubmit} sx={{ '& > *': { m: 1 } }}>
        <TextField
          label="User"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          fullWidth
          margin="normal"
          required
          placeholder="user:123"
        />
        <TextField
          label="Relation"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          fullWidth
          margin="normal"
          required
          placeholder="can_view"
        />
        <TextField
          label="Object"
          value={object}
          onChange={(e) => setObject(e.target.value)}
          fullWidth
          margin="normal"
          required
          placeholder="document:456"
        />
        <Button type="submit" variant="contained" fullWidth>
          Check Relationship
        </Button>
      </Box>

      {result !== null && (
        <Paper className="result-panel">
          <Typography variant="h6">Result:</Typography>
          <Typography>
            {result.allowed
              ? '✅ Allowed'
              : '❌ Not Allowed'}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
