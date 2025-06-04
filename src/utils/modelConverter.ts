export interface OpenFGAModel {
  schema_version: string;
  type_definitions: Array<{
    type: string;
    relations: {
      [key: string]: RelationDefinition;
    };
    metadata?: {
      relations: {
        [key: string]: {
          directly_related_user_types: Array<{
            type: string;
            relation?: string;
            wildcard?: Record<string, never>;
          }>;
        };
      };
    };
  }>;
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

export function dslToJson(dsl: string): OpenFGAModel {
  const lines = dsl.trim().split('\n');
  const model: OpenFGAModel = {
    schema_version: '1.1',
    type_definitions: []
  };

  let currentType: OpenFGAModel['type_definitions'][0] | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    if (trimmedLine.startsWith('model')) continue;
    if (trimmedLine.startsWith('schema')) {
      model.schema_version = trimmedLine.split(' ')[1];
      continue;
    }

    if (trimmedLine.startsWith('type ')) {
      if (currentType) {
        // Only add metadata if there are relations
        if (Object.keys(currentType.relations).length === 0) {
          delete currentType.metadata;
        }
        model.type_definitions.push(currentType);
      }
      currentType = {
        type: trimmedLine.split(' ')[1],
        relations: {}
      };
      // Only initialize metadata if we actually add relations
    } else if (trimmedLine.startsWith('define ') && currentType) {
      const [, relationName, definition] = trimmedLine.match(/define\s+(\w+):\s+(.+)/) || [];
      if (relationName && definition) {
        // Initialize metadata
        if (!currentType.metadata) {
          currentType.metadata = {
            relations: {}
          };
        }

        // Extract direct assignments first (everything inside [...])
        const directTypes = parseDirectlyRelatedTypes(definition);

        // Parse the full relation definition
        let relationDef: RelationDefinition;
        
        // If there are direct types, ensure they're included in the relation definition
        if (directTypes.length > 0) {
          const remainingDef = definition.replace(/\[.*?\]/, '').trim();
          if (remainingDef.startsWith('or ')) {
            // We have both direct assignments and other relations
            relationDef = {
              union: {
                child: [
                  { this: {} },
                  ...parseRelationDefinition(remainingDef.slice(3)).union?.child || []
                ]
              }
            };
          } else if (remainingDef.length === 0) {
            // Only direct assignments
            relationDef = { this: {} };
          } else {
            // Direct assignments with other parts but no 'or'
            relationDef = {
              union: {
                child: [
                  { this: {} },
                  parseRelationDefinition(remainingDef)
                ]
              }
            };
          }
        } else {
          // No direct assignments, just parse the definition normally
          relationDef = parseRelationDefinition(definition);
        }

        currentType.relations[relationName] = relationDef;
        currentType.metadata.relations[relationName] = {
          directly_related_user_types: directTypes
        };
      }
    }
  }

  if (currentType) {
    // Only add metadata if there are relations
    if (Object.keys(currentType.relations).length === 0) {
      delete currentType.metadata;
    }
    model.type_definitions.push(currentType);
  }

  return model;
}

function parseRelationDefinition(definition: string): RelationDefinition {
  // Split by 'or' first to handle all parts
  const parts = definition.split(' or ').map(part => part.trim());
  
  // If we have multiple parts, create a union
  if (parts.length > 1) {
    return {
      union: {
        child: parts.map(part => {
          // Handle direct assignments in union
          if (part.startsWith('[')) {
            return { this: {} };
          }
          // Handle "from" expressions in union
          if (part.includes(' from ')) {
            const [relation, fromPart] = part.split(' from ').map(p => p.trim());
            return {
              tupleToUserset: {
                tupleset: {
                  relation: fromPart
                },
                computedUserset: {
                  relation
                }
              }
            };
          }
          // Handle simple relations in union
          return {
            computedUserset: {
              relation: part
            }
          };
        })
      }
    };
  }

  // For single parts:
  const singlePart = parts[0];

  // Handle direct assignments
  if (singlePart.startsWith('[')) {
    return { this: {} };
  }

  // Handle "from" expressions
  if (singlePart.includes(' from ')) {
    const [relation, fromPart] = singlePart.split(' from ').map(p => p.trim());
    return {
      tupleToUserset: {
        tupleset: {
          relation: fromPart
        },
        computedUserset: {
          relation
        }
      }
    };
  }

  // Handle simple computed userset
  return {
    computedUserset: {
      relation: singlePart
    }
  };
}

function parseDirectlyRelatedTypes(definition: string): Array<{ type: string; relation?: string; wildcard?: Record<string, never> }> {
  // Find the first [...] block in the definition
  const match = definition.match(/\[(.*?)\]/);
  if (!match) return [];

  // Get the content inside brackets and split by commas
  const types = match[1].split(',').map(t => t.trim());
  
  return types.map(type => {
    // Handle group#member format
    if (type.includes('#')) {
      const [typeName, relation] = type.split('#').map(part => part.trim());
      return { type: typeName, relation };
    }
    // Handle user:* format
    if (type.includes(':*')) {
      const typeName = type.split(':')[0].trim();
      return { type: typeName, wildcard: {} };
    }
    // Handle simple type like user
    return { type };
  });
}

export function jsonToDsl(model: OpenFGAModel): string {
  let dsl = `model\n  schema ${model.schema_version}\n\n`;

  for (const typeDef of model.type_definitions) {
    dsl += `type ${typeDef.type}\n`;
    if (Object.keys(typeDef.relations).length > 0) {
      dsl += '  relations\n';
      for (const [relation, definition] of Object.entries(typeDef.relations)) {
        const directTypes = typeDef.metadata?.relations[relation]?.directly_related_user_types;
        dsl += `    define ${relation}: ${relationDefinitionToDsl(definition, directTypes)}\n`;
      }
    }
    dsl += '\n';
  }

  return dsl;
}

function relationDefinitionToDsl(definition: RelationDefinition, directTypes?: Array<{ type: string; relation?: string; wildcard?: Record<string, never> }>): string {
  // Handle direct assignments
  if (definition.this !== undefined) {
    if (directTypes && directTypes.length > 0) {
      return '[' + directTypes.map(formatDirectType).join(', ') + ']';
    }
    return '[]';
  }

  // Handle unions with direct assignments
  if (definition.union) {
    const childParts = definition.union.child.map((child, index) => {
      if (child.this !== undefined && directTypes && directTypes.length > 0) {
        // Only include direct types for the first this: {} in the union
        if (index === 0) {
          return '[' + directTypes.map(formatDirectType).join(', ') + ']';
        }
        return '[]';
      }
      return relationDefinitionToDsl(child);
    });
    return childParts.join(' or ');
  }

  if (definition.tupleToUserset) {
    return `${definition.tupleToUserset.computedUserset.relation} from ${definition.tupleToUserset.tupleset.relation}`;
  }

  if (definition.computedUserset) {
    return definition.computedUserset.relation;
  }

  return '';
}

function formatDirectType(type: { type: string; relation?: string; wildcard?: Record<string, never> }): string {
  if (type.relation) {
    return `${type.type}#${type.relation}`;
  }
  if (type.wildcard) {
    return `${type.type}:*`;
  }
  return type.type;
}
