import { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TextField, 
  Autocomplete,
  Alert, 
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { OpenFGAService } from '../../services/OpenFGAService';
import { extractRelationshipMetadata, type RelationshipMetadata } from '../../utils/tupleHelper';

interface TuplesTabProps {
  storeId: string;
  currentModel?: string;
  authModelId: string;
}

interface ApiError extends Error {
  response?: {
    data?: {
      message?: string;
      code?: string;
    };
  };
}

export const TuplesTab = ({ storeId, currentModel, authModelId }: TuplesTabProps) => {
  const [tuples, setTuples] = useState<Array<{ user: string; relation: string; object: string }>>([]);
  const [metadata, setMetadata] = useState<RelationshipMetadata | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'assisted' | 'freeform'>('assisted');
  const [loading, setLoading] = useState(false);
  
  // Form state for freeform mode
  const [freeformUser, setFreeformUser] = useState('');
  const [freeformRelation, setFreeformRelation] = useState('');
  const [freeformObject, setFreeformObject] = useState('');
  
  // Form state for assisted mode
  const [selectedType, setSelectedType] = useState('');
  const [user, setUser] = useState('');
  const [relation, setRelation] = useState('');
  const [object, setObject] = useState('');
  const [selectedObjectType, setSelectedObjectType] = useState('');

  // Available types from metadata
  const availableTypes = useMemo(() => 
    metadata ? Array.from(metadata.types.keys()) : [], 
    [metadata]
  );

  // Get possible target object types based on the model
  const possibleObjectTypes = useMemo(() => {
    if (!metadata) return [];
    return Array.from(metadata.types.keys()).filter(type => 
      // Filter types that have relationships defined
      metadata.types.get(type)?.relations && 
      Object.keys(metadata.types.get(type)?.relations || {}).length > 0
    );
  }, [metadata]);

  // Available relations for the selected type with descriptions
  const availableRelations = useMemo(() => {
    if (!selectedType || !metadata) return [];
    const typeMetadata = metadata.types.get(selectedType);
    if (!typeMetadata) return [];
    
    // Special case: if user type is selected and the target object is a group,
    // we want to show only the 'member' relation
    if (selectedType === 'user' && selectedObjectType === 'group') {
      return [{ id: 'member', label: 'member' }];
    }
    
    return typeMetadata.relations.map(relation => ({
      id: relation,
      label: relation
    }));
  }, [selectedType, selectedObjectType, metadata]);

  // Update object type when needed
  useEffect(() => {
    if (!selectedObjectType && possibleObjectTypes.length > 0) {
      setSelectedObjectType(possibleObjectTypes[0]);
    }
  }, [possibleObjectTypes, selectedObjectType]);

  // Update relation when object type changes
  useEffect(() => {
    if (selectedType === 'user' && selectedObjectType === 'group') {
      setRelation('member');
    }
  }, [selectedType, selectedObjectType]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const tuplesResponse = await OpenFGAService.listTuples(storeId);
        setTuples(tuplesResponse.tuples);

        if (currentModel) {
          const meta = extractRelationshipMetadata(currentModel);
          setMetadata(meta);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setError('Failed to load tuples. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [storeId, currentModel]);

  const handleAssistedSubmit = async () => {
    try {
      setError(null);
      setLoading(true);

      const formattedUser = user.includes(':') ? user : `${selectedType}:${user}`;
      const formattedObject = object.includes(':') ? object : `${selectedObjectType}:${object}`;

      // Always use 'member' for user-group relationships
      const actualRelation = selectedType === 'user' && selectedObjectType === 'group' ? 'member' : relation;

      await OpenFGAService.writeTuple(storeId, {
        user: formattedUser,
        relation: actualRelation,
        object: formattedObject
      }, authModelId);

      // Reset form
      setSelectedType('');
      setUser('');
      setRelation('');
      setObject('');
      setSelectedObjectType('');

      // Reload tuples
      const response = await OpenFGAService.listTuples(storeId);
      setTuples(response.tuples);
    } catch (error) {
      console.error('Failed to write tuple:', error);
      // Extract the error message from the response
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.message || apiError.message || 'Failed to add tuple';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFreeformSubmit = async () => {
    try {
      setError(null);
      setLoading(true);

      await OpenFGAService.writeTuple(storeId, {
        user: freeformUser,
        relation: freeformRelation,
        object: freeformObject
      }, authModelId);

      // Reset form
      setFreeformUser('');
      setFreeformRelation('');
      setFreeformObject('');

      // Reload tuples
      const response = await OpenFGAService.listTuples(storeId);
      setTuples(response.tuples);
    } catch (error) {
      console.error('Failed to write tuple:', error);
      setError(error instanceof Error ? error.message : 'Failed to add tuple');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', overflow: 'hidden', p: 2 }}>
      {/* Mode selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body1">Add Tuple Mode:</Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, newMode) => newMode && setMode(newMode)}
          size="small"
        >
          <ToggleButton value="assisted">
            Assisted
          </ToggleButton>
          <ToggleButton value="freeform">
            Freeform
          </ToggleButton>
        </ToggleButtonGroup>mem
      </Box>

      {/* Tuple editor form */}
      <Paper sx={{ p: 2, flexShrink: 0, width: '100%' }}>
        {mode === 'freeform' ? (
          // Freeform mode
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            width: '100%'
          }}>
            <TextField
              size="small"
              sx={{ width: 250 }}
              label="User"
              value={freeformUser}
              onChange={(e) => setFreeformUser(e.target.value)}
              required
              helperText="Format: type:id or type#relation@id"
            />
            
            <TextField
              size="small"
              sx={{ width: 250 }}
              label="Relation"
              value={freeformRelation}
              onChange={(e) => setFreeformRelation(e.target.value)}
              required
            />

            <TextField
              size="small"
              sx={{ width: 250 }}
              label="Object"
              value={freeformObject}
              onChange={(e) => setFreeformObject(e.target.value)}
              required
              helperText="Format: type:id"
            />

            <Button 
              variant="contained" 
              onClick={handleFreeformSubmit}
              disabled={loading || !freeformUser || !freeformRelation || !freeformObject}
            >
              {loading ? 'Adding...' : 'Add Tuple'}
            </Button>
          </Box>
        ) : (
          // Assisted mode
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            {/* First row - User information */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Autocomplete
                size="small"
                sx={{ width: 250 }}
                value={selectedType}
                onChange={(_, newValue) => {
                  setSelectedType(newValue || '');
                  setRelation('');
                }}
                options={availableTypes}
                renderInput={(params) => <TextField {...params} label="User Type" required />}
              />
              
              <TextField
                size="small"
                sx={{ width: 250 }}
                label="User Name"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                required
                helperText={`Will be prefixed with '${selectedType}:'`}
              />
            </Box>

            {/* Second row - Object information */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Autocomplete
                size="small"
                sx={{ width: 250 }}
                value={selectedObjectType}
                onChange={(_, newValue) => setSelectedObjectType(newValue || '')}
                options={possibleObjectTypes}
                renderInput={(params) => <TextField {...params} label="Object Type" required />}
              />
              
              <TextField
                size="small"
                sx={{ width: 250 }}
                label="Object Name"
                value={object}
                onChange={(e) => setObject(e.target.value)}
                required
                helperText={`Will be prefixed with '${selectedObjectType}:'`}
              />
            </Box>

            {/* Third row - Relation */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Autocomplete
                size="small"
                sx={{ width: 350 }}
                value={relation}
                onChange={(_, newValue) => {
                  const actualRelation = typeof newValue === 'string' ? newValue : newValue?.id;
                  setRelation(actualRelation || '');
                }}
                options={availableRelations}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.label;
                }}
                freeSolo
                disabled={!selectedType}
                renderInput={(params) => (
                  <TextField {...params} label="Relation" required />
                )}
              />
            </Box>

            {/* Fourth row - Tuple preview and submit button */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              p: 2,
              borderRadius: 1
            }}>
              <Typography 
                sx={{ 
                  fontFamily: 'monospace',
                  flex: 1,
                  fontSize: '0.9rem'
                }}
              >
                {selectedType && user ? `${selectedType}:${user}` : '<user>'} {' '}
                {relation || '<relation>'} {' '}
                {selectedObjectType && object ? `${selectedObjectType}:${object}` : '<object>'}
              </Typography>

              <Button 
                variant="contained" 
                onClick={handleAssistedSubmit}
                disabled={loading || !selectedType || !relation || !user || !object || !selectedObjectType}
              >
                {loading ? 'Adding...' : 'Add Tuple'}
              </Button>
            </Box>
          </Box>
        )}
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
                        setLoading(true);
                        await OpenFGAService.deleteTuple(storeId, tuple);
                        const response = await OpenFGAService.listTuples(storeId);
                        setTuples(response.tuples);
                      } catch (error) {
                        console.error('Failed to delete tuple:', error);
                        setError('Failed to delete tuple');
                      } finally {
                        setLoading(false);
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
