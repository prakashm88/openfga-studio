import { useState, useEffect, useMemo } from 'react';
import { Box, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Autocomplete } from '@mui/material';
import { OpenFGAService } from '../../services/OpenFGAService';
import { extractRelationshipMetadata, type RelationshipMetadata } from '../../utils/tupleHelper';

interface TuplesTabProps {
  storeId: string;
  currentModel?: string;
  authModelId: string;
}

export const TuplesTab = ({ storeId, currentModel, authModelId }: TuplesTabProps) => {
  const [tuples, setTuples] = useState<Array<{ user: string; relation: string; object: string }>>([]);
  const [metadata, setMetadata] = useState<RelationshipMetadata | undefined>();
  
  // Form state for inline tuple editor
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

  // Load tuples and metadata when store or model changes
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load tuples
        const tuplesResponse = await OpenFGAService.listTuples(storeId);
        setTuples(tuplesResponse.tuples);

        // Extract metadata if we have a model
        if (currentModel) {
          const meta = extractRelationshipMetadata(currentModel);
          setMetadata(meta);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, [storeId, currentModel]);

  const handleTupleSubmit = async () => {
    try {
      const formattedObject = object.includes(':') ? object : `${selectedType}:${object}`;
      const formattedUser = user.includes(':') || user.includes('#') ? 
        user : `${availableUserTypes[0].split(':')[0]}:${user}`;

      await OpenFGAService.writeTuple(storeId, {
        user: formattedUser,
        relation,
        object: formattedObject
      }, authModelId);

      // Reset form
      setSelectedType('');
      setUser('');
      setRelation('');
      setObject('');

      // Reload tuples
      const response = await OpenFGAService.listTuples(storeId);
      setTuples(response.tuples);
    } catch (error) {
      console.error('Failed to write tuple:', error);
    }
  };  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2,
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      p: 2
    }}>
      {/* Inline tuple editor */}
      <Paper sx={{ p: 2, flexShrink: 0, width: '100%' }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'flex-start',
          flexWrap: 'wrap', // Allow wrapping on smaller screens
          width: '100%'
        }}>
          <Autocomplete
            size="small"
            sx={{ width: 200 }}
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
            size="small"
            sx={{ width: 200 }}
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
            size="small"
            sx={{ width: 200 }}
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
                helperText="Enter value after type prefix"
              />
            )}
          />

          <TextField
            size="small"
            sx={{ width: 200 }}
            label="Object Name"
            value={object}
            onChange={(e) => setObject(e.target.value)}
            required
            helperText={`Will be prefixed with '${selectedType}:'`}
          />

          <Button 
            variant="contained" 
            onClick={handleTupleSubmit}
            disabled={!selectedType || !relation || !user || !object}
            sx={{ mt: 1 }}
          >
            Add Tuple
          </Button>
        </Box>
      </Paper>

      {/* Tuples table */}
      <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Relation</TableCell>
              <TableCell>Object</TableCell>
              <TableCell width={100} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tuples.map((tuple, index) => (
              <TableRow key={index}>
                <TableCell>{tuple.user}</TableCell>
                <TableCell>{tuple.relation}</TableCell>
                <TableCell>{tuple.object}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    color="error"
                    onClick={async () => {
                      try {
                        await OpenFGAService.deleteTuple(storeId, tuple);
                        const response = await OpenFGAService.listTuples(storeId);
                        setTuples(response.tuples);
                      } catch (error) {
                        console.error('Failed to delete tuple:', error);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
