import { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';

interface TupleEditorProps {
  onSubmit: (tuple: { user: string; relation: string; object: string }) => void;
}

export const TupleEditor = ({ onSubmit }: TupleEditorProps) => {
  const [user, setUser] = useState('');
  const [relation, setRelation] = useState('');
  const [object, setObject] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ user, relation, object });
    setUser('');
    setRelation('');
    setObject('');
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ '& > *': { m: 1 } }}>
      <TextField
        label="User"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        required
      />
      <TextField
        label="Relation"
        value={relation}
        onChange={(e) => setRelation(e.target.value)}
        required
      />
      <TextField
        label="Object"
        value={object}
        onChange={(e) => setObject(e.target.value)}
        required
      />
      <Button type="submit" variant="contained">
        Add Tuple
      </Button>
    </Box>
  );
};
