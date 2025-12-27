import React, { useState, useEffect, useMemo } from 'react';
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
  Typography,
  Slide,
  alpha,
  Select,
  MenuItem,
  type SlideProps
} from '@mui/material';
import { OpenFGAService } from '../../services/OpenFGAService';
import { extractRelationshipMetadata, type RelationshipMetadata, type RelationshipTuple } from '../../utils/tupleHelper';

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

interface RelationOption {
  id: string;
  label: string;
  condition?: {
    name: string;
    parameters: {
      [key: string]: {
        type_name: string;
      };
    };
  };
}

interface ConditionState {
  name: string;
  context: Record<string, string | number | boolean>;
}

// Slide transition component for the error toast
function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

export default function TuplesTab({ storeId, currentModel, authModelId }: TuplesTabProps) {
  const [tuples, setTuples] = useState<RelationshipTuple[]>([]);
  const [metadata, setMetadata] = useState<RelationshipMetadata | undefined>();
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mode, setMode] = useState<'assisted' | 'freeform'>('assisted');
  const [loading, setLoading] = useState(false);

  // Pagination state (infinite load more)
  const [pageSize, setPageSize] = useState<number>(10);
  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Form state for freeform mode
  const [freeformUser, setFreeformUser] = useState('');
  const [freeformRelation, setFreeformRelation] = useState('');
  const [freeformObject, setFreeformObject] = useState('');
  const [freeformCondition, setFreeformCondition] = useState('');
  
  // Form state for assisted mode
  const [selectedType, setSelectedType] = useState('');
  const [user, setUser] = useState('');
  const [relation, setRelation] = useState<RelationOption | null>(null);
  const [object, setObject] = useState('');
  const [selectedObjectType, setSelectedObjectType] = useState('');
  const [conditionState, setConditionState] = useState<ConditionState | null>(null);

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

  // Available relations based on the selected object type and user type
  const availableRelations = useMemo(() => {
    if (!selectedObjectType || !metadata) return [];
    
    // Get the object type metadata
    const objectTypeMetadata = metadata.types.get(selectedObjectType);
    if (!objectTypeMetadata) return [];
    
    // Get all relations that accept the selected user type
    const relations = objectTypeMetadata.relations.filter(relationName => {
      const userTypes = objectTypeMetadata.userTypes.get(relationName) || [];
      // Check if this relation accepts the selected user type
      return userTypes.some(type => type.startsWith(selectedType));
    });

    return relations.map(relation => {
      // Get related userTypes to check for conditions
      const userTypes = objectTypeMetadata.userTypes.get(relation) || [];
      // Find any condition from user types with the selected type
      const userTypeWithCondition = userTypes.find(type => type.startsWith(selectedType));
      
      // Get condition from the metadata if it exists
      const condition = userTypeWithCondition && metadata.conditions?.[userTypeWithCondition.split(' with ')[1]];

      return {
        id: relation,
        label: relation,
        condition: condition ? {
          name: condition.name,
          parameters: condition.parameters
        } : undefined
      };
    });
  }, [selectedType, selectedObjectType, metadata]);

  // Update relation when object type or user type changes
  useEffect(() => {
    setRelation(null); // Clear previous relation when types change
  }, [selectedType, selectedObjectType]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load first page with current pageSize
        const tuplesResponse = await OpenFGAService.listTuples(storeId, { page_size: pageSize });
        setTuples(tuplesResponse.tuples);
        setContinuationToken(tuplesResponse.continuation_token);

        if (currentModel) {
          const meta = extractRelationshipMetadata(currentModel);
          setMetadata(meta);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setNotification({
          message: 'Failed to load tuples. Please try again.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [storeId, currentModel, pageSize]);

  // Render condition parameters UI
  const renderConditionFields = () => {
    if (!relation?.condition) return null;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Condition Parameters for {relation.condition.name}
        </Typography>
        {Object.entries(relation.condition.parameters || {}).map(
          ([paramName, paramInfo]) => {
            const paramType = paramInfo.type_name
              .replace("TYPE_NAME_", "")
              .toLowerCase();
            return (
              <TextField
                key={paramName}
                size="small"
                sx={{ width: 350 }}
                label={`${paramName} (${paramType})`}
                value={conditionState?.context[paramName] ?? ""}
                onChange={(e) => {
                  const conditionName = relation.condition?.name;
                  if (conditionName) {
                    setConditionState((prev) => ({
                      name: conditionName,
                      context: {
                        ...(prev?.context || {}),
                        [paramName]: e.target.value,
                      },
                    }));
                  }
                }}
              />
            );
          }
        )}
      </Box>
    );
  };

  const handleAssistedSubmit = async () => {
    try {
      setNotification(null);
      setLoading(true);
      
      if (!relation) {
        throw new Error('Relation is required');
      }

      const formattedUser = user.includes(':') ? user : `${selectedType}:${user}`;
      const formattedObject = object.includes(':') ? object : `${selectedObjectType}:${object}`;

      const tuple: RelationshipTuple = {
        user: formattedUser,
        relation: relation.id,
        object: formattedObject,
        ...(conditionState ? { condition: conditionState } : {})
      };

      await OpenFGAService.writeTuple(storeId, tuple, authModelId);

      // Reset form
      setSelectedType('');
      setUser('');
      setRelation(null);
      setObject('');
      setSelectedObjectType('');
      setConditionState(null);

      // Reload tuples (reload first page with current pageSize)
      const response = await OpenFGAService.listTuples(storeId, { page_size: pageSize });
      setTuples(response.tuples);
      setContinuationToken(response.continuation_token);

      setNotification({
        message: `Successfully added tuple: ${formattedUser} ${relation.id} ${formattedObject}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to write tuple:', error);
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.message || apiError.message || 'Failed to add tuple';
      setNotification({
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFreeformSubmit = async () => {
    try {
      setNotification(null);
      setLoading(true);

      // Parse freeform condition if provided
      let conditionData = null;
      if (freeformCondition.trim()) {
        try {
          conditionData = JSON.parse(freeformCondition);
        } catch (e) {
          throw new Error('Invalid condition format. Please provide valid JSON.');
        }
      }

      const tuple: RelationshipTuple = {
        user: freeformUser,
        relation: freeformRelation,
        object: freeformObject,
        ...(conditionData ? { condition: conditionData } : {})
      };

      await OpenFGAService.writeTuple(storeId, tuple, authModelId);

      // Reset form
      setFreeformUser('');
      setFreeformRelation('');
      setFreeformObject('');
      setFreeformCondition('');

      // Reload tuples (reload first page with current pageSize)
      const response = await OpenFGAService.listTuples(storeId, { page_size: pageSize });
      setTuples(response.tuples);
      setContinuationToken(response.continuation_token);

      setNotification({
        message: `Successfully added tuple: ${freeformUser} ${freeformRelation} ${freeformObject}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to write tuple:', error);
      setNotification({
        message: error instanceof Error ? error.message : 'Failed to add tuple',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%'
    }}>
      {/* Header Section */}
      <Box sx={{ 
        bgcolor: 'background.paper',
        p: 2,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="h6" fontSize={18} fontWeight={"bold"}>
          Add Tuples
        </Typography>
      </Box>

      {/* Content Section */}
      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        {/* Mode selector and form */}
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}>
            <Typography fontSize={14}>Mode:</Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, newMode) => newMode && setMode(newMode)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 2,
                  bgcolor: 'action.hover',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    }
                  }
                }
              }}
            >
              <ToggleButton value="assisted" sx={{ textTransform: 'uppercase', fontSize: 13 }}>
                Assisted
              </ToggleButton>
              <ToggleButton value="freeform" sx={{ textTransform: 'uppercase', fontSize: 13 }}>
                Freeform
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ p: 3, bgcolor: 'background.paper' }}>
            {mode === 'freeform' ? (
              // Freeform mode
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: 2, 
                alignItems: 'flex-start',
                width: '100%'
              }}>
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
                </Box>

                <TextField
                  size="small"
                  sx={{ width: '100%', maxWidth: 600 }}
                  label="Condition (Optional)"
                  value={freeformCondition}
                  onChange={(e) => setFreeformCondition(e.target.value)}
                  multiline
                  rows={3}
                  helperText='JSON format: {"name": "condition_name", "context": {"param1": "value1"}}'
                  placeholder='{"name": "condition_name", "context": {"param1": "value1", "param2": "value2"}}'
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
                      setRelation(null);
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
                      setRelation(newValue);
                      setConditionState(null);
                    }}
                    options={availableRelations}
                    getOptionLabel={(option) => option.label}
                    freeSolo={false}
                    disabled={!selectedType}
                    renderInput={(params) => (
                      <TextField {...params} label="Relation" required />
                    )}
                  />
                </Box>

                {/* Condition Parameters */}
                {renderConditionFields()}

                {/* Fourth row - Tuple preview and submit button */}
                <Paper variant="outlined" sx={{ 
                  p: 2,
                  bgcolor: 'action.hover',
                  borderColor: 'divider'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2
                  }}>
                    <Box sx={{ 
                      flex: 1,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 0.5,
                      fontSize: '0.9rem',
                      fontFamily: '"Roboto Mono", monospace'
                    }}>
                      <Typography component="span" color="text.secondary">A user</Typography>
                      <Typography 
                        component="span" 
                        sx={{ 
                          color: 'primary.main',
                          bgcolor: alpha('#1976d2', 0.1),
                          px: 1,
                          py: 0.5,
                          borderRadius: 1
                        }}
                      >
                        {selectedType && user ? `${selectedType}:${user}` : '<user>'}
                      </Typography>

                      <Typography component="span" color="text.secondary">can act on</Typography>
                      <Typography 
                        component="span" 
                        sx={{ 
                          color: 'secondary.main',
                          bgcolor: alpha('#9c27b0', 0.1),
                          px: 1,
                          py: 0.5,
                          borderRadius: 1
                        }}
                      >
                        {selectedObjectType && object ? `${selectedObjectType}:${object}` : '<object>'}
                      </Typography>

                      <Typography component="span" color="text.secondary">as a</Typography>
                      <Typography 
                        component="span" 
                        sx={{ 
                          color: 'success.main',
                          bgcolor: alpha('#2e7d32', 0.1),
                          px: 1,
                          py: 0.5,
                          borderRadius: 1
                        }}
                      >
                        {relation?.label || '<relation>'}
                      </Typography>

                      {conditionState && (
                        <>
                          <Typography component="span" color="text.secondary">with</Typography>
                          {Object.entries(conditionState.context).map(([key, value], i, arr) => (
                            <React.Fragment key={key}>
                              <Typography
                                component="span"
                                sx={{
                                  color: "info.main",
                                  bgcolor: alpha("#0288d1", 0.1),
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                }}
                              >
                                {`${key} as ${value}`}
                              </Typography>
                              {i < arr.length - 1 && (
                                <Typography component="span" color="text.secondary">
                                  ,{" "}
                                </Typography>
                              )}
                            </React.Fragment>
                          ))}
                        </>
                      )}
                    </Box>

                    <Button 
                      variant="contained" 
                      onClick={handleAssistedSubmit}
                      disabled={loading || !selectedType || !relation || !user || !object || !selectedObjectType}
                    >
                      {loading ? 'Adding...' : 'Add Tuple'}
                    </Button>
                  </Box>
                </Paper>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Tuples table */}
        <Paper variant="outlined" sx={{ borderRadius: 1 }}>
          {/* Header: page size selector */}
          <Box sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography variant="subtitle2" color="text.secondary">Tuples</Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">Page size:</Typography>
              <Select
                size="small"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setContinuationToken(undefined); setTuples([]); }}
                sx={{ minWidth: 80 }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </Box>
          </Box>

          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Relation</TableCell>
                  <TableCell>Object</TableCell>
                  <TableCell>Condition</TableCell>
                  <TableCell width={100} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tuples.map((tuple, index) => (
                  <TableRow key={index}>
                    <TableCell>{tuple.user}</TableCell>
                    <TableCell>{tuple.relation}</TableCell>
                    <TableCell>{tuple.object}</TableCell>
                    <TableCell>
                      {tuple.condition ? (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {tuple.condition.name}
                          </Typography>
                          <Typography variant="body2">
                            {Object.entries(tuple.condition.context)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')}
                          </Typography>
                        </Box>
                      ) : null}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        onClick={async () => {
                          try {
                            setLoading(true);
                            await OpenFGAService.deleteTuple(storeId, tuple, authModelId);
                            // After delete, reload first page
                            const response = await OpenFGAService.listTuples(storeId, { page_size: pageSize });
                            setTuples(response.tuples);
                            setContinuationToken(response.continuation_token);
                            setNotification({
                              message: `Successfully deleted tuple: ${tuple.user} ${tuple.relation} ${tuple.object}`,
                              type: 'success'
                            });
                          } catch (error) {
                            console.error('Failed to delete tuple:', error);
                            setNotification({
                              message: 'Failed to delete tuple',
                              type: 'error'
                            });
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

                {/* Load more row */}
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Button
                      variant="outlined"
                      onClick={async () => {
                        if (!continuationToken) return;
                        try {
                          setLoadingMore(true);
                          const response = await OpenFGAService.listTuples(storeId, { page_size: pageSize, continuation_token: continuationToken });
                          setTuples(prev => [...prev, ...response.tuples]);
                          setContinuationToken(response.continuation_token);
                        } catch (error) {
                          console.error('Failed to load more tuples:', error);
                          setNotification({ message: 'Failed to load more tuples', type: 'error' });
                        } finally {
                          setLoadingMore(false);
                        }
                      }}
                      disabled={!continuationToken || loadingMore}
                    >
                      {loadingMore ? 'Loading...' : (continuationToken ? 'Load more' : 'No more tuples')}
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Snackbar 
          open={!!notification} 
          autoHideDuration={10000}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          TransitionComponent={SlideTransition}
          sx={{
            '& .MuiPaper-root': {
              maxWidth: '600px',
              minWidth: '400px'
            }
          }}
        >
          <Alert 
            onClose={() => setNotification(null)} 
            severity={notification?.type || 'info'}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification?.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};
