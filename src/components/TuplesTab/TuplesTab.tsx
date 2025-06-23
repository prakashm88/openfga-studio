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
  
  // Form state for freeform mode
  const [freeformUser, setFreeformUser] = useState('');
  const [freeformRelation, setFreeformRelation] = useState('');
  const [freeformObject, setFreeformObject] = useState('');
  
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
        const tuplesResponse = await OpenFGAService.listTuples(storeId);
        setTuples(tuplesResponse.tuples);

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
  }, [storeId, currentModel]);

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

      // Reload tuples
      const response = await OpenFGAService.listTuples(storeId);
      setTuples(response.tuples);

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
        bgcolor: 'background.default',
        p: 3,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 700, 
            color: '#79ED83', // OpenFGA green
            letterSpacing: '-0.025em',
            mb: 1
          }}
        >
          Relationship Tuples
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage relationship tuples that define permissions and access control
        </Typography>
      </Box>

      {/* Content Section */}
      <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
        {/* Mode selector and form */}
        <Paper sx={{ 
          mb: 3, 
          borderRadius: 3, 
          overflow: 'hidden',
          boxShadow: 2,
          border: 'none'
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            px: 3,
            py: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(121, 237, 131, 0.05)' 
              : 'rgba(121, 237, 131, 0.02)',
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Add New Tuple
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose your preferred input method
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, newMode) => newMode && setMode(newMode)}
              size="small"
              sx={{
                bgcolor: 'background.default',
                borderRadius: 2,
                '& .MuiToggleButton-root': {
                  px: 3,
                  py: 1,
                  border: 'none',
                  borderRadius: '6px !important',
                  fontWeight: 500,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    boxShadow: 1,
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    }
                  },
                  '&:not(.Mui-selected)': {
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }
                }
              }}
            >
              <ToggleButton value="assisted">
                ✨ Assisted
              </ToggleButton>
              <ToggleButton value="freeform">
                ⚡ Freeform
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ p: 4, bgcolor: 'background.paper' }}>
            {mode === 'freeform' ? (
              // Freeform mode
              <Box sx={{ 
                display: 'flex', 
                gap: 3, 
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                width: '100%'
              }}>
                <TextField
                  size="small"
                  sx={{ 
                    width: 280,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                  label="User"
                  value={freeformUser}
                  onChange={(e) => setFreeformUser(e.target.value)}
                  required
                  helperText="Format: type:id or type#relation@id"
                />
                
                <TextField
                  size="small"
                  sx={{ 
                    width: 200,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                  label="Relation"
                  value={freeformRelation}
                  onChange={(e) => setFreeformRelation(e.target.value)}
                  required
                />

                <TextField
                  size="small"
                  sx={{ 
                    width: 280,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
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
                  sx={{
                    minWidth: 120,
                    height: 40,
                    borderRadius: 2,
                    fontWeight: 600,
                  }}
                >
                  {loading ? 'Adding...' : 'Add Tuple'}
                </Button>
              </Box>
            ) : (
              // Assisted mode
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                {/* First row - User information */}
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                  <Autocomplete
                    size="small"
                    sx={{ 
                      width: 280,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
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
                    sx={{ 
                      width: 280,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                    label="User Name"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    required
                    helperText={selectedType ? `Will be prefixed with '${selectedType}:'` : 'Choose user type first'}
                  />
                </Box>

                {/* Second row - Object information */}
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                  <Autocomplete
                    size="small"
                    sx={{ 
                      width: 280,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                    value={selectedObjectType}
                    onChange={(_, newValue) => setSelectedObjectType(newValue || '')}
                    options={possibleObjectTypes}
                    renderInput={(params) => <TextField {...params} label="Object Type" required />}
                  />
                  
                  <TextField
                    size="small"
                    sx={{ 
                      width: 280,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                    label="Object Name"
                    value={object}
                    onChange={(e) => setObject(e.target.value)}
                    required
                    helperText={selectedObjectType ? `Will be prefixed with '${selectedObjectType}:'` : 'Choose object type first'}
                  />
                </Box>

                {/* Third row - Relation */}
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                  <Autocomplete
                    size="small"
                    sx={{ 
                      width: 400,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
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
                <Paper sx={{ 
                  p: 3,
                  bgcolor: (theme) => theme.palette.mode === 'dark' 
                    ? 'rgba(121, 237, 131, 0.03)' 
                    : 'rgba(121, 237, 131, 0.02)',
                  borderRadius: 3,
                  border: (theme) => theme.palette.mode === 'dark' 
                    ? '1px solid rgba(121, 237, 131, 0.2)' 
                    : '1px solid rgba(121, 237, 131, 0.1)',
                  boxShadow: 1
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary' }}>
                    Preview Relationship
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 3
                  }}>
                    <Box sx={{ 
                      flex: 1,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 1,
                      fontSize: '0.95rem',
                      fontFamily: '"Inter", sans-serif'
                    }}>
                      <Typography component="span" color="text.secondary" sx={{ fontWeight: 500 }}>
                        User
                      </Typography>
                      <Typography 
                        component="span" 
                        sx={{ 
                          color: 'primary.main',
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 2,
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        {selectedType && user ? `${selectedType}:${user}` : '<select user>'}
                      </Typography>

                      <Typography component="span" color="text.secondary" sx={{ fontWeight: 500 }}>
                        has relation
                      </Typography>
                      <Typography 
                        component="span" 
                        sx={{ 
                          color: 'success.main',
                          bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 2,
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        {relation?.label || '<select relation>'}
                      </Typography>

                      <Typography component="span" color="text.secondary" sx={{ fontWeight: 500 }}>
                        to
                      </Typography>
                      <Typography 
                        component="span" 
                        sx={{ 
                          color: 'secondary.main',
                          bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.1),
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 2,
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        {selectedObjectType && object ? `${selectedObjectType}:${object}` : '<select object>'}
                      </Typography>

                      {conditionState && (
                        <>
                          <Typography component="span" color="text.secondary" sx={{ fontWeight: 500 }}>
                            with conditions
                          </Typography>
                          {Object.entries(conditionState.context).map(([key, value], i, arr) => (
                            <React.Fragment key={key}>
                              <Typography
                                component="span"
                                sx={{
                                  color: "info.main",
                                  bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                                  px: 1.5,
                                  py: 0.75,
                                  borderRadius: 2,
                                  fontWeight: 600,
                                  fontSize: '0.85rem'
                                }}
                              >
                                {`${key}: ${value}`}
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
                      sx={{
                        minWidth: 140,
                        height: 48,
                        borderRadius: 2,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        boxShadow: 2,
                      }}
                    >
                      {loading ? 'Adding...' : '✅ Add Tuple'}
                    </Button>
                  </Box>
                </Paper>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Tuples table */}
        <Paper sx={{ 
          borderRadius: 3, 
          overflow: 'hidden',
          boxShadow: 2,
          border: 'none'
        }}>
          <Box sx={{ 
            p: 3, 
            borderBottom: 1, 
            borderColor: 'divider',
            bgcolor: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(121, 237, 131, 0.05)' 
              : 'rgba(121, 237, 131, 0.02)'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Existing Tuples
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tuples.length} relationship{tuples.length !== 1 ? 's' : ''} defined
            </Typography>
          </Box>
          
          <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    bgcolor: 'background.default',
                    borderBottom: 2,
                    borderColor: 'divider'
                  }}>
                    User
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    bgcolor: 'background.default',
                    borderBottom: 2,
                    borderColor: 'divider'
                  }}>
                    Relation
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    bgcolor: 'background.default',
                    borderBottom: 2,
                    borderColor: 'divider'
                  }}>
                    Object
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    bgcolor: 'background.default',
                    borderBottom: 2,
                    borderColor: 'divider'
                  }}>
                    Condition
                  </TableCell>
                  <TableCell 
                    width={120} 
                    align="right"
                    sx={{ 
                      fontWeight: 600, 
                      bgcolor: 'background.default',
                      borderBottom: 2,
                      borderColor: 'divider'
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tuples.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No tuples defined yet. Add your first relationship above.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  tuples.map((tuple, index) => (
                    <TableRow 
                      key={index}
                      sx={{ 
                        '&:hover': { 
                          bgcolor: 'action.hover',
                          '& .delete-button': {
                            opacity: 1
                          }
                        }
                      }}
                    >
                      <TableCell>
                        <Typography 
                          component="span" 
                          sx={{ 
                            fontFamily: '"Roboto Mono", monospace',
                            fontSize: '0.85rem',
                            color: 'primary.main',
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                          }}
                        >
                          {tuple.user}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          component="span" 
                          sx={{ 
                            fontFamily: '"Roboto Mono", monospace',
                            fontSize: '0.85rem',
                            color: 'success.main',
                            bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                          }}
                        >
                          {tuple.relation}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          component="span" 
                          sx={{ 
                            fontFamily: '"Roboto Mono", monospace',
                            fontSize: '0.85rem',
                            color: 'secondary.main',
                            bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.1),
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                          }}
                        >
                          {tuple.object}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {tuple.condition ? (
                          <Box>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'info.main',
                                bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                fontWeight: 500
                              }}
                            >
                              {tuple.condition.name}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                              {Object.entries(tuple.condition.context)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            None
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          className="delete-button"
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ 
                            opacity: 0.7,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            borderRadius: 2,
                            minWidth: 80,
                            '&:hover': {
                              opacity: 1,
                              transform: 'scale(1.05)'
                            }
                          }}
                          onClick={async () => {
                            try {
                              setLoading(true);
                              await OpenFGAService.deleteTuple(storeId, tuple, authModelId);
                              const response = await OpenFGAService.listTuples(storeId);
                              setTuples(response.tuples);
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
                          🗑️ Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Snackbar 
          open={!!notification} 
          autoHideDuration={6000}
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
            sx={{ 
              width: '100%',
              borderRadius: 3,
              boxShadow: 3,
              '& .MuiAlert-icon': {
                fontSize: '1.2rem'
              },
              '& .MuiAlert-message': {
                fontWeight: 500
              }
            }}
          >
            {notification?.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};
