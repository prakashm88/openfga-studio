import type { Node, Edge } from 'reactflow';

interface RelationType {
  name: string;
  definition: string;
}

interface TypeDefinition {
  name: string;
  relations: RelationType[];
}

export interface AuthModel {
  schemaVersion: string;
  typeDefinitions: TypeDefinition[];
}

interface OpenFGARelation {
  this?: Record<string, never>;
  computedUserset?: {
    object: string;
    relation: string;
  };
  union?: {
    child: Array<unknown>;
  };
}

interface OpenFGAType {
  type: string;
  relations?: Record<string, OpenFGARelation>;
}

interface OpenFGAModel {
  schema_version: string;
  type_definitions: OpenFGAType[];
}

function parseDSL(dsl: string): AuthModel {
  try {
    // First try to parse as JSON in case it's already in JSON format
    const jsonModel = JSON.parse(dsl) as OpenFGAModel;
    return {
      schemaVersion: jsonModel.schema_version,
      typeDefinitions: jsonModel.type_definitions.map((type) => ({
        name: type.type,
        relations: Object.entries(type.relations || {}).map(([name, def]) => ({
          name,
          definition: JSON.stringify(def)
        }))
      }))
    };
  } catch {
    // If JSON parse fails, treat it as DSL format
    const lines = dsl.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const model: AuthModel = {
      schemaVersion: '1.1',
      typeDefinitions: []
    };

    let currentType: TypeDefinition | null = null;

    for (const line of lines) {
      if (line.startsWith('model')) continue;
      if (line.startsWith('schema')) {
        model.schemaVersion = line.split(' ')[1];
        continue;
      }
      if (line.startsWith('type ')) {
        if (currentType) {
          model.typeDefinitions.push(currentType);
        }
        currentType = {
          name: line.split(' ')[1],
          relations: []
        };
      } else if (line.startsWith('define ') && currentType) {
        const relationParts = line.split(':');
        const name = relationParts[0].replace('define ', '').trim();
        const definition = relationParts[1].trim();
        currentType.relations.push({ name, definition });
      }
    }

    if (currentType) {
      model.typeDefinitions.push(currentType);
    }

    return model;
  }
}

export function parseAuthModelToGraph(dslContent: string): { nodes: Node[]; edges: Edge[] } {
  try {
    const model = parseDSL(dslContent);
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 1;
    
    // Position calculation helpers
    const typeSpacing = 300;
    const relationSpacing = 150;
    const maxNodesPerColumn = 4;
    let currentColumn = 0;
    let currentRow = 0;

    // Create nodes for each type with improved layout
    model.typeDefinitions.forEach((typeDef) => {
      const typeNodeId = `type-${nodeId}`;
      
      // Calculate position with column wrap
      const x = currentColumn * typeSpacing;
      const y = (currentRow % maxNodesPerColumn) * relationSpacing;
      
      // Add type node
      nodes.push({
        id: typeNodeId,
        data: { 
          label: typeDef.name,
          type: 'type'
        },
        position: { x, y },
        type: 'default'
      });

      // Process relations with better spacing
      typeDef.relations.forEach((relation, index) => {
        nodeId++;
        const relationNodeId = `relation-${nodeId}`;
        const relationX = x + 150;
        const relationY = y + (index + 1) * (relationSpacing / 2);

        // Add relation node
        nodes.push({
          id: relationNodeId,
          data: { 
            label: relation.name,
            type: 'relation'
          },
          position: { x: relationX, y: relationY },
          type: 'default'
        });

        // Add edge from type to relation
        edges.push({
          id: `edge-${typeNodeId}-${relationNodeId}`,
          source: typeNodeId,
          target: relationNodeId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#2684ff' }
        });

        // Process relation definition parts
        const parts = relation.definition.split(' or ');
        parts.forEach((part, partIndex) => {
          nodeId++;
          const cleanPart = part.trim();
          const definitionNodeId = `def-${nodeId}`;
          const definitionX = relationX + 150;
          const definitionY = relationY + (partIndex * 40);

          // Add definition node
          nodes.push({
            id: definitionNodeId,
            data: { 
              label: cleanPart,
              type: 'definition'
            },
            position: { x: definitionX, y: definitionY },
            type: 'default'
          });

          // Add edge from relation to definition
          edges.push({
            id: `edge-${relationNodeId}-${definitionNodeId}`,
            source: relationNodeId,
            target: definitionNodeId,
            type: 'smoothstep',
            style: { stroke: '#4caf50' }
          });
        });
      });

      // Update position tracking
      if (currentRow >= maxNodesPerColumn - 1) {
        currentColumn++;
        currentRow = 0;
      } else {
        currentRow++;
      }
      nodeId++;
    });

    console.log('Generated nodes:', nodes);
    console.log('Generated edges:', edges);
    return { nodes, edges };
  } catch (error) {
    console.error('Failed to parse authorization model:', error);
    return { nodes: [], edges: [] };
  }
}
