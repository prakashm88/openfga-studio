import { useState, useMemo } from 'react';
import { TextField, Button, Box, Autocomplete } from '@mui/material';
import type { RelationshipMetadata } from '../../utils/tupleHelper';

interface TupleEditorProps {
  onSubmit: (tuple: { user: string; relation: string; object: string }) => void;
  metadata?: RelationshipMetadata;
}

export const TupleEditor = ({ onSubmit, metadata }: TupleEditorProps) => {
  const [selectedType, setSelectedType] = useState('');
  const [user, setUser] = useState('');
  const [relation, setRelation] = useState('');
  const [object, setObject] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedObject = object.includes(':') ? object : `${selectedType}:${object}`;
    onSubmit({ 
      user: user.includes(':') || user.includes('#') ? user : `${availableUserTypes[0].split(':')[0]}:${user}`,
      relation,
      object: formattedObject 
    });
    setUser('');
    setRelation('');
    setObject('');
    setSelectedType('');
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

      <Button type="submit" variant="contained" disabled={!selectedType || !relation || !user || !object}>
        Add Tuple
      </Button>
    </Box>
  );
};
