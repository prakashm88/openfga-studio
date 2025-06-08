import type { Node, Edge } from 'reactflow';

export interface RelationType {
  name: string;
  definition: string;
}

export interface TypeDefinition {
  name: string;
  relations: RelationType[];
}

export interface AuthModel {
  schemaVersion: string;
  typeDefinitions: TypeDefinition[];
  conditions?: Array<{
    name: string;
    parameters: string;
    expression: string;
  }>;
}

export interface OpenFGARelation {
  this?: Record<string, never>;
  computedUserset?: {
    relation: string;
  };
  union?: {
    child: OpenFGARelation[];
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

export interface OpenFGAType {
  type: string;
  relations?: Record<string, OpenFGARelation>;
  metadata?: {
    relations: {
      [key: string]: {
        directly_related_user_types: Array<{
          type: string;
          relation?: string;
          wildcard?: Record<string, never>;
          condition?: string;
        }>;
      };
    };
  };
}

export interface OpenFGAModel {
  schema_version: string;
  type_definitions: OpenFGAType[];
  conditions?: {
    [key: string]: {
      name: string;
      expression: string;
      parameters: {
        [key: string]: {
          type_name: string;
        };
      };
    };
  };
}
