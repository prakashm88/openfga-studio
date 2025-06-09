import { useState, useEffect, useMemo } from 'react';
import { Box, Paper, TextField, Button, Typography, ToggleButton, ToggleButtonGroup, Autocomplete, Alert, alpha } from '@mui/material';
import { OpenFGAService } from '../../services/OpenFGAService';
import { extractRelationshipMetadata, type RelationshipMetadata, formatTupleUser, formatTupleObject } from '../../utils/tupleHelper';

interface QueryTabProps {
  storeId: string;
  currentModel?: string;
  authModelId: string;
}

interface SavedQuery {
  timestamp: number;
  query: { user: string; relation: string; object: string };
  result: { allowed: boolean };
  queryText?: string;
}

export const QueryTab = ({ storeId, currentModel, authModelId }: QueryTabProps) => {
  const [metadata, setMetadata] = useState<RelationshipMetadata>();
  const [queryMode, setQueryMode] = useState<'form' | 'text'>('form');
  const [selectedType, setSelectedType] = useState('');
  const [selectedObjectType, setSelectedObjectType] = useState('');
  const [user, setUser] = useState('');
  const [relation, setRelation] = useState('');
  const [object, setObject] = useState('');
  const [textQuery, setTextQuery] = useState('');
  const [result, setResult] = useState<{ allowed: boolean } | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available types from metadata
  const availableTypes = useMemo(() => 
    metadata ? Array.from(metadata.types.keys()) : [], 
    [metadata]
  );

  // Available relations based on the selected object type and user type
  const availableRelations = useMemo(() => {
    if (!selectedObjectType || !metadata || !selectedType) return [];
    
    // Get the object type metadata
    const objectTypeMetadata = metadata.types.get(selectedObjectType);
    if (!objectTypeMetadata) return [];
    
    // Get all relations that accept the selected user type
    const relations = objectTypeMetadata.relations.filter(relationName => {
      const userTypes = objectTypeMetadata.userTypes.get(relationName) || [];
      // Check if this relation accepts the selected user type
      return userTypes.some(type => type.startsWith(selectedType) || type === selectedType);
    });

    return relations;
  }, [selectedType, selectedObjectType, metadata]);

  // Available user types for the selected relation
  const availableUserTypes = useMemo(() => 
    selectedType && relation && metadata ? 
      metadata.types.get(selectedType)?.userTypes.get(relation) || []
      : [],
    [selectedType, relation, metadata]
  );

  useEffect(() => {
    if (currentModel) {
      try {
        const meta = extractRelationshipMetadata(currentModel);
        setMetadata(meta);
        // Reset form when model changes
        setSelectedType('');
        setUser('');
        setRelation('');
        setObject('');
        setResult(null);
        setError(null);
      } catch (error) {
        console.error('Failed to extract relationship metadata:', error);
        setError('Failed to parse authorization model');
      }
    }
  }, [currentModel]);

  useEffect(() => {
    const saved = localStorage.getItem(`queries-${storeId}`);
    if (saved) {
      try {
        setSavedQueries(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved queries:', error);
        setSavedQueries([]);
      }
    }
  }, [storeId]);

  const parseTextQuery = (query: string): { user: string; relation: string; object: string } | null => {
    // Support both natural language and type:id formats
    const naturalMatch = query.match(/is\s+([^\s]+)\s+related\s+to\s+([^\s]+)\s+as\s+([^\s?]+)/i);
    if (naturalMatch) {
      const [, user, object, relation] = naturalMatch;
      return { user, relation, object };
    }

    // Try parsing type:id#relation@object format
    const directMatch = query.match(/([^\s#]+)#([^\s@]+)@([^\s]+)/);
    if (directMatch) {
      const [, user, relation, object] = directMatch;
      return { user, relation, object };
    }

    return null;
  };

  const handleQueryCheckForm = async () => {
    if (!selectedType || !selectedObjectType || !relation || !user || !object) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const formattedObject = formatTupleObject(object, selectedObjectType);
      const formattedUser = formatTupleUser(user, availableUserTypes[0]?.split(':')[0]);

      const query = {
        user: formattedUser,
        relation,
        object: formattedObject
      };

      const checkResult = await OpenFGAService.check(storeId, query, authModelId);
      setResult(checkResult);

      const newQuery: SavedQuery = { 
        timestamp: Date.now(), 
        query,
        result: checkResult
      };

      const updatedQueries = [newQuery, ...savedQueries].slice(0, 50);
      setSavedQueries(updatedQueries);
      localStorage.setItem(`queries-${storeId}`, JSON.stringify(updatedQueries));

      // Reset form only on successful submission
      setSelectedType('');
      setUser('');
      setRelation('');
      setObject('');
    } catch (error) {
      console.error('Query check failed:', error);
      setError('Failed to check authorization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQueryCheckText = async () => {
    if (!textQuery.trim()) {
      setError('Please enter a query');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const query = parseTextQuery(textQuery);
      if (!query) {
        setError('Invalid query format. Use either "is user related to object as relation" or "type:user#relation@object"');
        return;
      }

      const checkResult = await OpenFGAService.check(storeId, query, authModelId);
      setResult(checkResult);

      const newQuery: SavedQuery = { 
        timestamp: Date.now(), 
        query,
        result: checkResult,
        queryText: textQuery
      };

      const updatedQueries = [newQuery, ...savedQueries].slice(0, 50);
      setSavedQueries(updatedQueries);
      localStorage.setItem(`queries-${storeId}`, JSON.stringify(updatedQueries));
    } catch (error) {
      console.error('Query check failed:', error);
      setError('Failed to check authorization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplayQuery = (savedQuery: SavedQuery) => {
    if (savedQuery.queryText) {
      setQueryMode('text');
      setTextQuery(savedQuery.queryText);
    } else {
      setQueryMode('form');
      const objectParts = savedQuery.query.object.split(':');
      if (objectParts.length === 2) {
        setSelectedType(objectParts[0]);
        setObject(objectParts[1]);
      }
      setRelation(savedQuery.query.relation);
      setUser(savedQuery.query.user);
    }
    setResult(null);
    setError(null);
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
          Validate Tuples
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
              value={queryMode}
              exclusive
              onChange={(_, mode) => mode && setQueryMode(mode)}
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
              <ToggleButton value="form" sx={{ textTransform: 'uppercase', fontSize: 13 }}>
                Assisted
              </ToggleButton>
              <ToggleButton value="text" sx={{ textTransform: 'uppercase', fontSize: 13 }}>
                Freeform
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ p: 3, bgcolor: 'background.paper' }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}

            {queryMode === 'form' ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* First row - User information */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Autocomplete
                    size="small"
                    sx={{ width: 250 }}
                    value={selectedType}
                    onChange={(_, newValue) => {
                      setSelectedType(newValue || '');
                      setUser('');
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
                    options={availableTypes}
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
                    onChange={(_, newValue) => setRelation(newValue || '')}
                    options={availableRelations}
                    renderInput={(params) => <TextField {...params} label="Relation" required />}
                    disabled={!selectedType || !selectedObjectType || availableRelations.length === 0}
                  />
                </Box>
                 

                {/* Preview section */}
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
                      <Typography component="span" color="text.secondary">Can</Typography>
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
                        {user || '<user>'}
                      </Typography>

                      <Typography component="span" color="text.secondary">have</Typography>
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
                        {relation || '<relation>'}
                      </Typography>

                      <Typography component="span" color="text.secondary">access to</Typography>
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
                        {selectedType && object ? `${selectedType}:${object}` : '<object>'}
                      </Typography>
                      <Typography component="span" color="text.secondary">?</Typography>
                    </Box>

                    <Button 
                      variant="contained" 
                      onClick={handleQueryCheckForm}
                      disabled={isSubmitting || !selectedType || !relation || !user || !object}
                    >
                      Check Access
                    </Button>
                  </Box>
                </Paper>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  size="small"
                  label="Query"
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                  multiline
                  rows={2}
                  fullWidth
                  helperText='Format: "is user related to object as relation" or "type:user#relation@object"'
                />
                
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
                    <Typography 
                      sx={{ 
                        flex: 1,
                        fontFamily: '"Roboto Mono", monospace',
                        fontSize: '0.9rem',
                        color: textQuery ? 'text.primary' : 'text.secondary'
                      }}
                    >
                      {textQuery || 'Enter your authorization query...'}
                    </Typography>

                    <Button 
                      variant="contained" 
                      onClick={handleQueryCheckText}
                      disabled={isSubmitting || !textQuery.trim()}
                    >
                      Check Access
                    </Button>
                  </Box>
                </Paper>
              </Box>
            )}

            {result !== null && (
              <Alert 
                severity={result.allowed ? 'success' : 'error'}
                sx={{ mt: 2 }}
              >
                {result.allowed ? 'Access Allowed' : 'Access Denied'}
              </Alert>
            )}
          </Box>
        </Paper>

        {/* Recent Queries */}
        {savedQueries.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: 16 }}>Recent Queries</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {savedQueries.map((query, index) => (
                <Paper 
                  key={index} 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    bgcolor: 'background.paper',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => handleReplayQuery(query)}
                >
                  <Typography variant="body2" color="text.secondary">
                    {query.queryText || `${query.query.user} - ${query.query.relation} - ${query.query.object}`}
                  </Typography>
                  <Alert 
                    severity={query.result.allowed ? 'success' : 'error'}
                    sx={{ mt: 1 }}
                  >
                    {query.result.allowed ? 'Allowed' : 'Denied'}
                  </Alert>
                </Paper>
              ))}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};
