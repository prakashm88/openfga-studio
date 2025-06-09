import { useState, useMemo } from 'react';
import { TextField, Button, Box, Autocomplete, Alert, Snackbar } from '@mui/material';
import type { RelationshipMetadata } from '../../utils/tupleHelper';

interface TupleEditorProps {
  onSubmit: (tuple: { user: string; relation: string; object: string }) => Promise<void>;
  metadata?: RelationshipMetadata;
}

export const TupleEditor = ({ onSubmit, metadata }: TupleEditorProps) => {
  const [selectedType, setSelectedType] = useState('');
  const [user, setUser] = useState('');
  const [relation, setRelation] = useState('');
  const [object, setObject] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Available types from metadata
  const availableTypes = useMemo(() => 
    metadata ? Array.from(metadata.types.keys()) : [], 
    [metadata]
  );

  // Available relations for the selected type
  const availableRelations = useMemo(() => 
    selectedType && metadata ? 
      metadata.types.get(selectedType)?.relations || [] 
      : [],
    [selectedType, metadata]
  );

  // Available user types for the selected relation
  const availableUserTypes = useMemo(() => 
    selectedType && relation && metadata ? 
      metadata.types.get(selectedType)?.userTypes.get(relation) || []
      : [],
    [selectedType, relation, metadata]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formattedObject = object.includes(':') ? object : `${selectedType}:${object}`;
    const formattedUser = user.includes(':') || user.includes('#') ? 
      user : 
      `${availableUserTypes[0]?.split(':')[0] || 'user'}:${user}`;

    try {
      await onSubmit({ 
        user: formattedUser,
        relation,
        object: formattedObject 
      });

      // Reset form on success
      setUser('');
      setRelation('');
      setObject('');
      setSelectedType('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tuple');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Autocomplete
        value={selectedType}
        onChange={(_, newValue) => {
          setSelectedType(newValue || '');
          setRelation('');
        }}
        options={availableTypes}
        renderInput={(params) => <TextField {...params} label="Type" required />}
      />
      
      <Autocomplete
        value={relation}
        onChange={(_, newValue) => {
          setRelation(newValue || '');
          setUser('');
        }}
        options={availableRelations}
        freeSolo
        disabled={!selectedType}
        renderInput={(params) => (
          <TextField 
            {...params} 
            label="Relation" 
            required 
            helperText={availableRelations.length === 0 ? "Enter any relation name" : undefined}
          />
        )}
      />
      
      <Autocomplete
        value={user}
        onChange={(_, newValue) => setUser(newValue || '')}
        options={availableUserTypes}
        freeSolo
        disabled={!relation}
        renderInput={(params) => (
          <TextField 
            {...params} 
            label="User" 
            required
            helperText="Enter value after type prefix, e.g. for user:john enter 'john'"
          />
        )}
      />

      <TextField
        label="Object Name"
        value={object}
        onChange={(e) => setObject(e.target.value)}
        required
        helperText={`Will be prefixed with '${selectedType}:' if no type prefix is provided`}
      />

      <Button 
        type="submit" 
        variant="contained" 
        disabled={loading || !selectedType || !relation || !user || !object}
      >
        {loading ? 'Adding...' : 'Add Tuple'}
      </Button>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};
