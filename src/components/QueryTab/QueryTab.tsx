import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  alpha,
  Alert,
  Snackbar,
} from "@mui/material";
import { OpenFGAService } from "../../services/OpenFGAService";
import {
  extractRelationshipMetadata,
  type RelationshipMetadata,
  type RelationshipTuple,
} from "../../utils/tupleHelper";

interface QueryTabProps {
  storeId: string;
  currentModel?: string;
  authModelId: string;
}

interface SavedQuery {
  timestamp: number;
  query: RelationshipTuple;
  result: { allowed: boolean };
  queryText?: string;
}

interface RelationOption {
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

export const QueryTab = ({
  storeId,
  currentModel,
  authModelId,
}: QueryTabProps) => {
  const [metadata, setMetadata] = useState<RelationshipMetadata>();
  const [queryMode, setQueryMode] = useState<"form" | "text">("form");
  const [selectedType, setSelectedType] = useState("");
  const [selectedObjectType, setSelectedObjectType] = useState("");
  const [user, setUser] = useState("");
  const [relation, setRelation] = useState<RelationOption | null>(null);
  const [object, setObject] = useState("");
  const [textQuery, setTextQuery] = useState("");
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conditionState, setConditionState] = useState<ConditionState | null>(
    null
  );
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Available types from metadata
  const availableTypes = useMemo(
    () => (metadata ? Array.from(metadata.types.keys()) : []),
    [metadata]
  );

  // Available relations based on the selected object type and user type
  const availableRelations = useMemo(() => {
    if (!selectedObjectType || !metadata || !selectedType) return [];

    // Get the object type metadata
    const objectTypeMetadata = metadata.types.get(selectedObjectType);
    if (!objectTypeMetadata) return [];

    // Get all relations that accept the selected user type
    const relations = objectTypeMetadata.relations.filter((relationName) => {
      const userTypes = objectTypeMetadata.userTypes.get(relationName) || [];
      // Check if this relation accepts the selected user type
      return userTypes.some(
        (type) => type.startsWith(selectedType) || type === selectedType
      );
    });

    return relations.map((relation) => ({
      id: relation,
      label: relation,
      condition: objectTypeMetadata.conditions?.get(relation),
    }));
  }, [selectedType, selectedObjectType, metadata]);

  // Reset condition state when relation changes
  useEffect(() => {
    setConditionState(null);
  }, [relation]);

  useEffect(() => {
    if (currentModel) {
      try {
        const meta = extractRelationshipMetadata(currentModel);
        setMetadata(meta);
        // Reset form when model changes
        setSelectedType("");
        setUser("");
        setRelation(null);
        setObject("");
        setSelectedObjectType("");
        setError(null);
        setConditionState(null);
      } catch (error) {
        console.error("Failed to extract relationship metadata:", error);
        setError("Failed to parse authorization model");
      }
    }
  }, [currentModel]);

  useEffect(() => {
    const saved = localStorage.getItem(`queries-${storeId}`);
    if (saved) {
      try {
        setSavedQueries(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load saved queries:", error);
      }
    }
  }, [storeId]);

  const formatQueryAsText = (query: RelationshipTuple): string => {
    return `is ${query.user} related to ${query.object} as ${query.relation}`;
  };

  const handleReplayQuery = (savedQuery: SavedQuery) => {
    // Switch to text mode and use the saved text format
    setQueryMode("text");
    setTextQuery(savedQuery.queryText || formatQueryAsText(savedQuery.query));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let query: RelationshipTuple;

      if (queryMode === "form") {
        const formattedUser = user.includes(":") ? user : `${selectedType}:${user}`;
        const formattedObject = object.includes(":") ? object : `${selectedObjectType}:${object}`;

        query = {
          user: formattedUser,
          relation: relation?.label || "",
          object: formattedObject,
        };

        if (relation?.condition && conditionState) {
          query.condition = {
            name: relation.condition?.name || "",
            context: conditionState.context,
          };
        }
      } else {
        // Natural language query handling
        const naturalLanguageRegex = /is\s+([^\s]+)\s+related\s+to\s+([^\s]+)\s+as\s+([^\s?]+)/i;
        const match = textQuery.match(naturalLanguageRegex);
        
        if (match) {
          const [, user, object, relation] = match;
          query = { user, relation, object };
        } else {
          // Not natural language, try JSON
          try {
            query = JSON.parse(textQuery);
          } catch {
            setError('Invalid query format. Use either "is user related to object as relation" or a valid JSON object.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      const response = await OpenFGAService.check(storeId, query, authModelId);
      const result = response.allowed;

      // Show result in snackbar
      setSnackbar({
        open: true,
        message: result ? "Access Allowed" : "Access Denied",
        severity: result ? "success" : "error"
      });

      // Save query to history with both formats
      const newQuery: SavedQuery = {
        query,
        result: { allowed: result },
        timestamp: Date.now(),
        queryText: queryMode === "text" ? textQuery : formatQueryAsText(query),
      };

      setSavedQueries((prev) => [newQuery, ...prev].slice(0, 10));

      // Optionally reset form in form mode
      if (queryMode === "form") {
        setSelectedType("");
        setUser("");
        setRelation(null);
        setObject("");
        setSelectedObjectType("");
        setConditionState(null);
      }
    } catch (err) {
      console.error("Query check failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to check access";
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header Section */}
      <Box
        sx={{
          bgcolor: "background.paper",
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" fontSize={18} fontWeight="bold">
          Validate Access
        </Typography>
      </Box>

      {/* Content Section */}
      <Box sx={{ p: 2, flex: 1, overflow: "auto" }}>
        {/* Mode selector and form */}
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1.5,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            <Typography fontSize={14}>Mode:</Typography>
            <ToggleButtonGroup
              value={queryMode}
              exclusive
              onChange={(_, newMode) => newMode && setQueryMode(newMode)}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  px: 2,
                  bgcolor: "action.hover",
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": {
                      bgcolor: "primary.dark",
                    },
                  },
                },
              }}
            >
              <ToggleButton
                value="form"
                sx={{ textTransform: "uppercase", fontSize: 13 }}
              >
                Assisted
              </ToggleButton>
              <ToggleButton
                value="text"
                sx={{ textTransform: "uppercase", fontSize: 13 }}
              >
                Freeform
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ p: 3, bgcolor: "background.paper" }}>
            {error && (
              <Alert
                severity="error"
                variant="standard"
                sx={{
                  mb: 2,
                  backgroundColor: (theme) =>
                    alpha(theme.palette.error.main, 0.08),
                  border: "none",
                  "& .MuiAlert-icon": {
                    color: (theme) => theme.palette.error.main,
                    opacity: 0.8,
                  },
                }}
              >
                {error}
              </Alert>
            )}

            {queryMode === "form" ? (
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ display: "flex", flexDirection: "column", gap: 3 }}
              >
                {/* First row - User information */}
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                  <Autocomplete
                    size="small"
                    sx={{ width: 250 }}
                    value={selectedType}
                    onChange={(_, newValue) => {
                      setSelectedType(newValue || "");
                      setRelation(null);
                    }}
                    options={availableTypes}
                    renderInput={(params) => (
                      <TextField {...params} label="User Type" required />
                    )}
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
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                  <Autocomplete
                    size="small"
                    sx={{ width: 250 }}
                    value={selectedObjectType}
                    onChange={(_, newValue) => {
                      setSelectedObjectType(newValue || "");
                      setRelation(null);
                    }}
                    options={availableTypes}
                    renderInput={(params) => (
                      <TextField {...params} label="Object Type" required />
                    )}
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
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
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
                    renderInput={(params) => (
                      <TextField {...params} label="Relation" required />
                    )}
                    disabled={
                      !selectedType ||
                      !selectedObjectType ||
                      availableRelations.length === 0
                    }
                  />
                </Box>

                {/* Condition Parameters */}
                {relation?.condition && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Typography variant="subtitle2" color="text.secondary">
                      Condition Parameters for {relation.condition?.name}
                    </Typography>
                    {Object.entries(relation.condition?.parameters || {}).map(
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
                            required
                          />
                        );
                      }
                    )}
                  </Box>
                )}

                {/* Preview section */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: "action.hover",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 0.5,
                        fontSize: "0.9rem",
                        fontFamily: '"Roboto Mono", monospace',
                      }}
                    >
                      <Typography component="span" color="text.secondary">
                        Can
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          color: "primary.main",
                          bgcolor: alpha("#1976d2", 0.1),
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                        }}
                      >
                        {selectedType && user
                          ? `${selectedType}:${user}`
                          : "<user>"}
                      </Typography>

                      <Typography component="span" color="text.secondary">
                        have
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          color: "success.main",
                          bgcolor: alpha("#2e7d32", 0.1),
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                        }}
                      >
                        {relation?.label || "<relation>"}
                      </Typography>

                      <Typography component="span" color="text.secondary">
                        access to
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          color: "secondary.main",
                          bgcolor: alpha("#9c27b0", 0.1),
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                        }}
                      >
                        {selectedObjectType && object
                          ? `${selectedObjectType}:${object}`
                          : "<object>"}
                      </Typography>
                      <Typography component="span" color="text.secondary">
                        ?
                      </Typography>
                    </Box>

                    <Button
                      variant="contained"
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !selectedType ||
                        !relation ||
                        !user ||
                        !object ||
                        !selectedObjectType ||
                        (relation.condition && !conditionState)
                      }
                    >
                      {isSubmitting ? "Checking..." : "Check Access"}
                    </Button>
                  </Box>
                </Paper>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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

                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: "action.hover",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        flex: 1,
                        fontFamily: '"Roboto Mono", monospace',
                        fontSize: "0.9rem",
                        color: textQuery ? "text.primary" : "text.secondary",
                      }}
                    >
                      {textQuery || "Enter your authorization query..."}
                    </Typography>

                    <Button
                      variant="contained"
                      onClick={(e) => {
                        setError(null);
                        handleSubmit(e);
                      }}
                      disabled={isSubmitting || !textQuery.trim()}
                    >
                      Check Access
                    </Button>
                  </Box>
                </Paper>
              </Box>
            )}

            {/* Result Snackbar */}
            <Snackbar
              open={snackbar.open}
              autoHideDuration={10000}
              onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <Alert
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                severity={snackbar.severity}
                variant="filled"
                sx={{ 
                  width: "100%",
                  "& .MuiAlert-message": {
                    display: "flex",
                    alignItems: "center",
                    gap: 2
                  }
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {snackbar.message}
                  </Typography>
                </Box>
              </Alert>
            </Snackbar>
          </Box>
        </Paper>

        {/* Recent Queries */}
        {savedQueries.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: 16 }}>
              Recent Queries
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {savedQueries.map((query, index) => (
                <Paper
                  key={index}
                  variant="outlined"
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    bgcolor: "background.paper",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                  onClick={() => handleReplayQuery(query)}
                >
                  <Typography variant="body1" color="text.secondary">
                    {query.queryText ||
                      `${query.query.user} - ${query.query.relation} - ${query.query.object}`}
                  </Typography>

                  <Alert
                    severity={query.result.allowed ? "success" : "error"}
                    sx={{
                      mt: 1,
                      backgroundColor: (theme) =>
                        query.result.allowed
                          ? alpha(theme.palette.success.main, 0.08)
                          : alpha(theme.palette.error.main, 0.08),
                      border: "none",
                      "& .MuiAlert-message": {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                      },
                      "& .MuiAlert-icon": {
                        color: (theme) =>
                          query.result.allowed
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                        opacity: 0.8,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        justifyContent: "flex-start",
                      }}
                    >
                      {query.result.allowed ? "Allowed" : "Denied"}
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        justifyContent: "flex-end",
                        fontSize: "0.7rem",
                      }}
                    >
                      {new Date(query.timestamp).toLocaleString()}
                    </Box>
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
