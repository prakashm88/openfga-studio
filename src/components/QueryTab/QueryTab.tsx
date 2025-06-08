import { useState, useEffect, useMemo } from 'react';
import { Box, Paper, TextField, Button, Typography, ToggleButton, ToggleButtonGroup, Autocomplete, Alert } from '@mui/material';
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
    if (!selectedType || !relation || !user || !object) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const formattedObject = formatTupleObject(object, selectedType);
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
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Check Authorization</Typography>
        
        <ToggleButtonGroup
          value={queryMode}
          exclusive
          onChange={(_, mode) => mode && setQueryMode(mode)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="form">Form Mode</ToggleButton>
          <ToggleButton value="text">Text Mode</ToggleButton>
        </ToggleButtonGroup>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {queryMode === 'form' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              value={selectedType}
              onChange={(_, newValue) => setSelectedType(newValue || '')}
              options={availableTypes}
              renderInput={(params) => <TextField {...params} label="Object Type" />}
            />
            
            {selectedType && (
              <>
                <Autocomplete
                  value={relation}
                  onChange={(_, newValue) => setRelation(newValue || '')}
                  options={availableRelations}
                  renderInput={(params) => <TextField {...params} label="Relation" />}
                />

                <TextField
                  label="Object ID"
                  value={object}
                  onChange={(e) => setObject(e.target.value)}
                  helperText={`Will be formatted as ${selectedType}:objectId`}
                />

                {relation && (
                  <TextField
                    label="User"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    helperText={`Suggested types: ${availableUserTypes.join(', ')}`}
                  />
                )}
              </>
            )}

            <Button 
              variant="contained" 
              onClick={handleQueryCheckForm}
              disabled={isSubmitting || !selectedType || !relation || !user || !object}
            >
              Check Authorization
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Query"
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              multiline
              rows={2}
              helperText='Format: "is user related to object as relation" or "type:user#relation@object"'
            />
            <Button 
              variant="contained" 
              onClick={handleQueryCheckText}
              disabled={isSubmitting || !textQuery.trim()}
            >
              Check Authorization
            </Button>
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
      </Paper>

      {savedQueries.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Recent Queries</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {savedQueries.map((query, index) => (
              <Paper 
                key={index} 
                variant="outlined" 
                sx={{ p: 1, cursor: 'pointer' }}
                onClick={() => handleReplayQuery(query)}
              >
                <Typography variant="body2" color="textSecondary">
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
  );
};