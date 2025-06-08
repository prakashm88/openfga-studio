import { TextField, Button, Box, Paper, Typography, Autocomplete } from '@mui/material';
import { useState, useMemo } from 'react';
import type { RelationshipMetadata } from '../../utils/tupleHelper';

interface QueryRunnerProps {
  onCheck: (query: { user: string; relation: string; object: string }) => Promise<{ allowed: boolean }>;
  metadata?: RelationshipMetadata;
}

export const QueryRunner = ({ onCheck, metadata }: QueryRunnerProps) => {
  const [selectedType, setSelectedType] = useState('');
  const [user, setUser] = useState('');
  const [relation, setRelation] = useState('');
  const [object, setObject] = useState('');
  const [result, setResult] = useState<{ allowed: boolean } | null>(null);

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
    try {
      const formattedObject = object.includes(':') ? object : `${selectedType}:${object}`;
      const formattedUser = user.includes(':') || user.includes('#') ? 
        user : `${availableUserTypes[0].split(':')[0]}:${user}`;

      const response = await onCheck({ 
        user: formattedUser,
        relation,
        object: formattedObject
      });
      setResult(response);
    } catch (error) {
      console.error('Error running query:', error);
      setResult(null);
    }
  };

  return (
    <Box className="query-runner">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Autocomplete
          value={selectedType}
          onChange={(_, newValue) => {
            setSelectedType(newValue || '');
            setRelation('');
            setObject('');
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
          disabled={!selectedType}
          renderInput={(params) => <TextField {...params} label="Relation" required />}
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
          fullWidth
          disabled={!selectedType || !relation || !user || !object}
        >
          Check Relationship
        </Button>
      </Box>

      {result !== null && (
        <Paper 
          sx={{ 
            p: 2, 
            mt: 2,
            bgcolor: result.allowed ? 'success.main' : 'error.main',
            color: 'white'
          }}
        >
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
