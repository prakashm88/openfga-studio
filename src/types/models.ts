

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

export interface OpenFGAModel {
  schema_version: string;
  type_definitions: Array<{
    type: string;
    relations?: Record<string, OpenFGARelation>;
    metadata?: {
      relations: Record<string, {
        directly_related_user_types?: Array<{
          type: string;
          relation?: string;
          wildcard?: Record<string, never>;
          condition?: string;
        }>;
      }>;
    };
  }>;
  conditions?: Record<string, OpenFGACondition>;
}

export interface OpenFGARelation {
  this?: Record<string, unknown>;
  union?: {
    child: OpenFGARelation[];
  };
  intersection?: {
    child: OpenFGARelation[];
  };
  computedUserset?: {
    relation: string;
  };
  tupleToUserset?: {
    tupleset: {
      relation: string;
    };
    computedUserset: {
      relation: string;
    };
  };
  direct?: {
    nodes: string[];
  };
}

export interface OpenFGACondition {
  name: string;
  parameters: Record<string, { type_name: string }>;
  expression: string;
}
