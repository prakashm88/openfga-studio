import { dslToJson } from './modelConverter';

interface TypeMetadata {
  type: string;
  relations: Array<string>;
  userTypes: Map<string, Array<string>>;
  allowDirectInput?: boolean;
  conditions?: Map<string, {
    name: string;
    parameters: {
      [key: string]: {
        type_name: string;
      };
    };
    expression: string;
  }>;
}

export interface RelationshipMetadata {
  types: Map<string, TypeMetadata>;
  conditions?: {
    [key: string]: {
      name: string;
      parameters: {
        [key: string]: {
          type_name: string;
        };
      };
      expression: string;
    };
  };
}

export interface RelationshipTuple {
  user: string;
  relation: string;
  object: string;
  condition?: {
    name: string;
    context: Record<string, string | number | boolean>;
  };
}

interface RelationDefinition {
  this?: Record<string, never>;
  computedUserset?: {
    relation: string;
  };
  union?: {
    child: RelationDefinition[];
  };
  tupleToUserset?: {
    computedUserset: {
      relation: string;
    };
    tupleset: {
      relation: string;
    };
  };
}

interface TypeDefinition {
  type: string;
  relations?: Record<string, RelationDefinition>;
  metadata?: {
    relations?: Record<string, {
      directly_related_user_types?: Array<{
        type: string;
        relation?: string;
        wildcard?: Record<string, never>;
        condition?: string;
      }>;
    }>;
  };
}

interface AuthorizationModel {
  type_definitions: TypeDefinition[];
  conditions?: {
    [key: string]: {
      name: string;
      parameters: {
        [key: string]: {
          type_name: string;
        };
      };
      expression: string;
    };
  };
}

export function formatTupleUser(user: string, suggestedType?: string): string {
  if (user.includes(':') || user.includes('#')) {
    return user;
  }
  return `${suggestedType || 'user'}:${user}`;
}

export function formatTupleObject(object: string, objectType: string): string {
  return object.includes(':') ? object : `${objectType}:${object}`;
}

export function parseTupleObject(object: string): { type: string; id: string } {
  const [type, ...rest] = object.split(':');
  return {
    type,
    id: rest.join(':') // Handle cases where ID might contain colons
  };
}

export function extractRelationshipMetadata(modelStr: string): RelationshipMetadata {
  const types = new Map<string, TypeMetadata>();
  let conditions: RelationshipMetadata['conditions'];
  
  try {
    // Try to parse as JSON first
    const model = JSON.parse(modelStr) as AuthorizationModel;
    
    // Extract conditions if they exist
    if (model.conditions) {
      conditions = model.conditions;
    }
    
    model.type_definitions.forEach((typeDef: TypeDefinition) => {
      const typeMetadata: TypeMetadata = {
        type: typeDef.type,
        relations: [],
        userTypes: new Map(),
        conditions: new Map(),
        allowDirectInput: true
      };

      if (typeDef.relations) {
        Object.entries(typeDef.relations).forEach(([relationName]) => {
          typeMetadata.relations.push(relationName);
          
          // Get explicit user types from metadata
          const directTypes = typeDef.metadata?.relations?.[relationName]?.directly_related_user_types || [];
          const userTypes = new Set<string>();

          directTypes.forEach(dt => {
            // Add the type with proper formatting
            if (dt.relation) {
              userTypes.add(`${dt.type}#${dt.relation}`);
            } else if (dt.wildcard) {
              userTypes.add(`${dt.type}:*`);
            } else if (dt.condition) {
              userTypes.add(`${dt.type} with ${dt.condition}`);
              // Store condition info if available
              if (conditions?.[dt.condition]) {
                typeMetadata.conditions?.set(relationName, conditions[dt.condition]);
              }
            } else {
              userTypes.add(`${dt.type}`);
            }
          });

          // Store the user types in the metadata
          if (userTypes.size > 0) {
            typeMetadata.userTypes.set(relationName, Array.from(userTypes));
          } else {
            typeMetadata.userTypes.set(relationName, ['user']);
          }
        });
      }

      types.set(typeDef.type, typeMetadata);
    });

    return { types, conditions };
  } catch (error: unknown) {
    // If JSON parse fails, try DSL format
    try {
      const model = dslToJson(modelStr) as AuthorizationModel;
      return extractRelationshipMetadata(JSON.stringify(model));
    } catch (dslError: unknown) {
      console.error('Failed to parse model in both JSON and DSL format:', { jsonError: error, dslError });
      throw error;
    }
  }
}
