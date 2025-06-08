import { dslToJson } from './modelConverter';

interface TypeMetadata {
  type: string;
  relations: string[];
  userTypes: Map<string, string[]>;
}

export interface RelationshipMetadata {
  types: Map<string, TypeMetadata>;
}

export interface RelationshipTuple {
  user: string;
  relation: string;
  object: string;
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
  
  try {
    // Try to parse as JSON first
    const model = JSON.parse(modelStr) as AuthorizationModel;
    
    model.type_definitions.forEach((typeDef: TypeDefinition) => {
      const typeMetadata: TypeMetadata = {
        type: typeDef.type,
        relations: [],
        userTypes: new Map()
      };

      if (typeDef.relations) {
        // Add all relations from the type definition
        Object.entries(typeDef.relations).forEach(([relationName, relationDef]) => {
          typeMetadata.relations.push(relationName);
          
          // Get the user types that can be used in this relation
          const directTypes = typeDef.metadata?.relations?.[relationName]?.directly_related_user_types || [];
          const userTypes = new Set<string>();

          // Add explicitly defined types first
          directTypes.forEach(dt => {
            if (dt.relation) {
              userTypes.add(`${dt.type}#${dt.relation}`);
            } else if (dt.wildcard) {
              userTypes.add(`${dt.type}:*`);
            } else if (dt.condition) {
              userTypes.add(`${dt.type} with ${dt.condition}`);
            } else {
              userTypes.add(dt.type);
            }
          });

          // If no explicit types, infer them from the relation definition
          if (userTypes.size === 0 && relationDef) {
            // For direct relations
            if ('this' in relationDef) {
              userTypes.add('user');
            }
            
            // For computed relations
            if ('computedUserset' in relationDef && relationDef.computedUserset) {
              userTypes.add('user');
            }
            
            // For unions
            if ('union' in relationDef && relationDef.union?.child) {
              relationDef.union.child.forEach(child => {
                if ('this' in child || 'computedUserset' in child) {
                  userTypes.add('user');
                }
              });
            }
            
            // For tuple-to-userset relations
            if ('tupleToUserset' in relationDef && relationDef.tupleToUserset) {
              userTypes.add('user');
            }
          }
          
          typeMetadata.userTypes.set(relationName, Array.from(userTypes));
        });
      }

      types.set(typeDef.type, typeMetadata);
    });
  } catch (error: unknown) {
    // If JSON parse fails, try DSL format
    try {
      const model = dslToJson(modelStr) as AuthorizationModel;
      return extractRelationshipMetadata(JSON.stringify(model));
    } catch (dslError: unknown) {
      console.error('Failed to parse model in both JSON and DSL format:', { jsonError: error, dslError });
    }
  }

  return { types };
}
