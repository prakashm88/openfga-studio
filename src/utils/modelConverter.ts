import type { OpenFGAModel, OpenFGARelation, OpenFGACondition } from '../types/models';

type RelationDefinition = OpenFGARelation;

export function dslToJson(dsl: string): OpenFGAModel {
  const lines = dsl.trim().split("\n");
  const model: OpenFGAModel = {
    schema_version: "1.1",
    type_definitions: [],
    conditions: {}
  };

  let currentType: OpenFGAModel["type_definitions"][0] | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    if (trimmedLine.startsWith("model")) continue;
    if (trimmedLine.startsWith("schema")) {
      model.schema_version = trimmedLine.split(" ")[1];
      continue;
    }

    if (trimmedLine.startsWith("condition ")) {
      // Handle multiline conditions by looking for the closing brace
      let conditionStr = trimmedLine;
      let i = lines.indexOf(line) + 1;
      while (i < lines.length && !lines[i].includes("}")) {
        conditionStr += "\n" + lines[i];
        i++;
      }
      if (i < lines.length) {
        conditionStr += "\n" + lines[i];
      }
      const condition = parseCondition(conditionStr);
      if (!model.conditions) {
        model.conditions = {};
      }
      model.conditions[condition.name] = condition;
      continue;
    }

    if (trimmedLine.startsWith("type ")) {
      if (currentType) {
        model.type_definitions.push(currentType);
      }
      currentType = {
        type: trimmedLine.split(" ")[1],
        relations: {},
        metadata: {
          relations: {}
        }
      };
    } else if (trimmedLine.startsWith("define ") && currentType) {
      const [, relationName, definition] = trimmedLine.match(/define\s+(\w+):\s+(.+)/) || [];
      if (relationName && definition) {
        // Extract direct assignments first (everything inside [...])
        const directTypes = parseDirectlyRelatedTypes(definition);

        // Parse the full relation definition
        let relationDef: RelationDefinition;

        // If there are direct types, ensure they're included in the relation definition
        if (directTypes.length > 0) {
          const remainingDef = definition.replace(/\[.*?\]/, "").trim();
          if (remainingDef.startsWith("or ")) {
            // We have both direct assignments and other relations
            relationDef = {
              union: {
                child: [
                  { this: {} },
                  ...(parseRelationDefinition(remainingDef.slice(3)).union?.child || []),
                ],
              },
            };
          } else if (remainingDef.length === 0) {
            // Only direct assignments
            relationDef = { this: {} };
          } else {
            // Direct assignments with other parts but no 'or'
            relationDef = {
              union: {
                child: [{ this: {} }, parseRelationDefinition(remainingDef)],
              },
            };
          }
        } else {
          // No direct assignments, just parse the definition normally
          relationDef = parseRelationDefinition(definition);
        }

        if (currentType.relations) {
          currentType.relations[relationName] = relationDef;
        }
        if (currentType.metadata?.relations && directTypes.length > 0) {
          currentType.metadata.relations[relationName] = {
            directly_related_user_types: directTypes,
          };
        }
      }
    }
  }

  if (currentType) {
    model.type_definitions.push(currentType);
  }

  return model;
}

function parseRelationDefinition(definition: string): RelationDefinition {
  const parts = definition.split(" or ").map((part) => part.trim());

  if (parts.length > 1) {
    return {
      union: {
        child: parts.map((part) => {
          if (part.startsWith("[")) {
            return { this: {} };
          }
          if (part.includes(" from ")) {
            const [relation, fromPart] = part.split(" from ").map((p) => p.trim());
            return {
              tupleToUserset: {
                tupleset: {
                  relation: fromPart,
                },
                computedUserset: {
                  relation,
                },
              },
            };
          }
          return {
            computedUserset: {
              relation: part,
            },
          };
        }),
      },
    };
  }

  const singlePart = parts[0];

  if (singlePart.startsWith("[")) {
    return { this: {} };
  }

  if (singlePart.includes(" from ")) {
    const [relation, fromPart] = singlePart.split(" from ").map((p) => p.trim());
    return {
      tupleToUserset: {
        tupleset: {
          relation: fromPart,
        },
        computedUserset: {
          relation,
        },
      },
    };
  }

  return {
    computedUserset: {
      relation: singlePart,
    },
  };
}

function parseCondition(conditionStr: string): OpenFGACondition {
  // Handle multiline conditions with improved regex for CEL expressions
  const conditionMatch = conditionStr.match(/condition\s+(\w+)\s*\((.*?)\)\s*{([\s\S]*?)}/);
  if (!conditionMatch) {
    throw new Error(`Invalid condition format. Expected format: condition name(param1: type1, param2: type2) { expression }. Got: ${conditionStr}`);
  }

  const [, name, params, expression] = conditionMatch;
  
  // Validate that we have a name
  if (!name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid condition name. Must be a valid identifier: ${name}`);
  }

  const parameters: Record<string, { type_name: string }> = {};
  
  // Parse and validate parameters
  if (params.trim()) {
    params.split(",").forEach((param) => {
      const parts = param.trim().split(":");
      if (parts.length !== 2) {
        throw new Error(`Invalid parameter format in condition. Expected "name: type", got: ${param}`);
      }
      const [paramName, paramType] = parts.map(p => p.trim());
      
      // Validate parameter name
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(paramName)) {
        throw new Error(`Invalid parameter name in condition. Must be a valid identifier: ${paramName}`);
      }
      
      // Validate parameter type
      const validTypes = ["timestamp", "duration", "int", "bool", "string"];
      const type = paramType.toLowerCase();
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid parameter type in condition. Must be one of ${validTypes.join(", ")}, got: ${paramType}`);
      }
      
      parameters[paramName] = {
        type_name: `TYPE_NAME_${type.toUpperCase()}`
      };
    });
  }

  params.split(",").forEach((param) => {
    const [paramName, paramType] = param.trim().split(":").map((p) => p.trim());
    parameters[paramName] = {
      type_name: `TYPE_NAME_${paramType.toUpperCase()}`,
    };
  });

  // Clean and validate the expression
  const cleanExpression = expression.trim();
  if (!cleanExpression) {
    throw new Error("Empty condition expression");
  }

  // Validate that the expression only uses declared parameters
  const paramNames = Object.keys(parameters);
  const expressionVars = cleanExpression.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const undeclaredVars = expressionVars.filter(v => !paramNames.includes(v));
  if (undeclaredVars.length > 0) {
    throw new Error(`Condition expression uses undeclared variables: ${undeclaredVars.join(", ")}`);
  }

  // Basic CEL operator validation
  const validOperators = ['+', '-', '*', '/', '%', '==', '!=', '<', '<=', '>', '>=', '&&', '||', '!'];
  const operatorRegex = /[+\-*/%<>=!&|]+/g;
  const operators = cleanExpression.match(operatorRegex) || [];
  const invalidOps = operators.filter(op => !validOperators.includes(op) && 
    !validOperators.some(valid => op === valid || op === valid + '=' || op === valid + valid));
  if (invalidOps.length > 0) {
    throw new Error(`Invalid operators in condition expression: ${invalidOps.join(", ")}`);
  }

  return {
    name,
    expression: cleanExpression,
    parameters,
  };
}

function parseDirectlyRelatedTypes(definition: string): Array<{
  type: string;
  relation?: string;
  wildcard?: Record<string, never>;
  condition?: string;
}> {
  const match = definition.match(/\[(.*?)\]/);
  if (!match) return [];

  const types = match[1].split(",").map((t) => t.trim());

  return types.map((type) => {
    if (type.includes("#")) {
      const [typeName, relation] = type.split("#").map((part) => part.trim());
      return { type: typeName, relation };
    }
    if (type.includes(":*")) {
      const typeName = type.split(":")[0].trim();
      return { type: typeName, wildcard: {} };
    }
    if (type.includes(" with ")) {
      const [baseType, condition] = type.split(" with ").map((part) => part.trim());
      return { type: baseType, condition };
    }
    return { type };
  });
}

export function jsonToDsl(model: OpenFGAModel): string {
  let dsl = `model\n  schema ${model.schema_version}\n\n`;

  // Add conditions first
  if (model.conditions) {
    for (const [name, condition] of Object.entries(model.conditions)) {
      const parameters = Object.entries(condition.parameters)
        .map(([param, { type_name }]) => {
          const type = type_name.replace("TYPE_NAME_", "").toLowerCase();
          return `${param}: ${type}`;
        })
        .join(", ");

      dsl += `condition ${name}(${parameters}) {\n  ${condition.expression}\n}\n\n`;
    }
  }

  // Add type definitions
  for (const typeDef of model.type_definitions) {
    dsl += `type ${typeDef.type}\n`;
    if (typeDef.relations && Object.keys(typeDef.relations).length > 0) {
      dsl += "  relations\n";
      for (const [relation, definition] of Object.entries(typeDef.relations)) {
        const directTypes = typeDef.metadata?.relations[relation]?.directly_related_user_types;
        dsl += `    define ${relation}: ${relationDefinitionToDsl(definition, directTypes)}\n`;
      }
    }
    dsl += "\n";
  }

  return dsl;
}

function relationDefinitionToDsl(
  definition: RelationDefinition,
  directTypes?: Array<{
    type: string;
    relation?: string;
    wildcard?: Record<string, never>;
    condition?: string;
  }>
): string {
  if (definition.this !== undefined) {
    if (directTypes && directTypes.length > 0) {
      return "[" + directTypes.map(formatDirectType).join(", ") + "]";
    }
    return "[]";
  }

  if (definition.union) {
    const childParts = definition.union.child.map((child) => {
      if (child.this !== undefined && directTypes && directTypes.length > 0) {
        return "[" + directTypes.map(formatDirectType).join(", ") + "]";
      }
      return relationDefinitionToDsl(child, directTypes);
    });
    return childParts.join(" or ");
  }

  if (definition.tupleToUserset) {
    return `${definition.tupleToUserset.computedUserset.relation} from ${definition.tupleToUserset.tupleset.relation}`;
  }

  if (definition.computedUserset) {
    return definition.computedUserset.relation;
  }

  return "";
}

function formatDirectType(type: {
  type: string;
  relation?: string;
  wildcard?: Record<string, never>;
  condition?: string;
}): string {
  let formatted = type.type;

  if (type.relation) {
    formatted += `#${type.relation}`;
  } else if (type.wildcard) {
    formatted += `:*`;
  }

  if (type.condition) {
    formatted += ` with ${type.condition}`;
  }

  return formatted;
}
