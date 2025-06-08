import { dslToJson } from './modelConverter';

interface TypeMetadata {
  type: string;
  relations: Array<string>;
  userTypes: Map<string, Array<string>>;
  allowDirectInput?: boolean;
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
  const reverseRelations = new Map<string, Set<{targetType: string, relation: string}>>();
  
  try {
    // Try to parse as JSON first
    const model = JSON.parse(modelStr) as AuthorizationModel;
    
    // First pass: collect all direct relations and build reverse index
    model.type_definitions.forEach((typeDef: TypeDefinition) => {
      const typeMetadata: TypeMetadata = {
        type: typeDef.type,
        relations: [],
        userTypes: new Map(),
        allowDirectInput: true
      };

      if (typeDef.relations) {
        Object.entries(typeDef.relations).forEach(([relationName]) => {
          typeMetadata.relations.push(relationName);
          
          // Get explicit user types from metadata
          const directTypes = typeDef.metadata?.relations?.[relationName]?.directly_related_user_types || [];
          const userTypes = new Set<string>();

          directTypes.forEach(dt => {
            // Add to reverse index
            if (!reverseRelations.has(dt.type)) {
              reverseRelations.set(dt.type, new Set());
            }
            reverseRelations.get(dt.type)?.add({
              targetType: typeDef.type,
              relation: relationName
            });

            // Add the type with proper formatting
            if (dt.relation) {
              // For relations like group#member
              userTypes.add(`${dt.type}#${dt.relation}`);
            } else if (dt.wildcard) {
              // For wildcard types like user:*
              userTypes.add(`${dt.type}:*`);
            } else if (dt.condition) {
              // For conditional types
              userTypes.add(`${dt.type} with ${dt.condition}`);
            } else {
              // For direct types like user, group, folder
              userTypes.add(`${dt.type}`);
            }
          });

          // Store the user types in the metadata
          if (userTypes.size > 0) {
            typeMetadata.userTypes.set(relationName, Array.from(userTypes));
          } else {
            // Default to accepting user type if no explicit types are defined
            typeMetadata.userTypes.set(relationName, ['user']);
          }
        });
      }

      types.set(typeDef.type, typeMetadata);
    });

    // Second pass: add reverse relations to types that can be users
    reverseRelations.forEach((targetRelations, userType) => {
      const typeMetadata = types.get(userType) || {
        type: userType,
        relations: [],
        userTypes: new Map(),
        allowDirectInput: true
      };

      targetRelations.forEach(({targetType, relation}) => {
        const relName = `can_be_${relation}_of_${targetType}`;
        if (!typeMetadata.relations.includes(relName)) {
          typeMetadata.relations.push(relName);
          typeMetadata.userTypes.set(relName, [targetType]);
        }
      });

      types.set(userType, typeMetadata);
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
