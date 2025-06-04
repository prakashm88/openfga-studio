import { type Node, type Edge, MarkerType } from 'reactflow';

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

const LAYOUT_CONFIG = {
  // Base positioning
  ROOT_X: 150,         // Starting X position
  ROOT_Y: 60,          // Reduced starting Y position
  
  // Spacing configuration
  LEVEL_SPACING_X: 500,    // Horizontal space between levels
  SIBLING_SPACING_Y: 100,  // Reduced vertical space between siblings for better compactness
  NODE_GROUP_SPACING: 140, // Space between groups
  INDENTATION: 180,       // Indentation for hierarchy visualization
  
  // Node sizing for better proportions
  NODE_WIDTH: {
    TYPE: 140,
    RELATION: 160,
    DEFINITION: 220
  },
  NODE_HEIGHT: 40,
  
  // Visual adjustments
  PADDING: 60,            // More padding for better spacing
  
  // Colors
  COLORS: {
    TYPE_EDGE: '#2684ff',
    RELATION_EDGE: '#4caf50',
    DEFINITION_EDGE: '#ff9800'
  }
};

export function parseAuthModelToGraph(dslContent: string): { nodes: Node[]; edges: Edge[] } {
  try {
    const model = parseDSL(dslContent);
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 1;
    
    // Calculate total height needed per type
    const typeHeights: Record<number, number> = {};
    model.typeDefinitions.forEach((typeDef, index) => {
      // Base height for type node
      let height = LAYOUT_CONFIG.NODE_HEIGHT + LAYOUT_CONFIG.PADDING;
      
      // Add height for each relation and its definitions
      typeDef.relations.forEach(relation => {
        height += LAYOUT_CONFIG.SIBLING_SPACING_Y; // Space for relation
        const defCount = relation.definition.split(' or ').length;
        height += defCount * (LAYOUT_CONFIG.SIBLING_SPACING_Y / 2); // Space for definitions
      });
      
      typeHeights[index] = height;
    });
    
    // Add root node
    const rootNodeId = 'root';
    nodes.push({
      id: rootNodeId,
      data: { 
        label: 'Authorization Model',
        type: 'type'
      },
      position: { x: LAYOUT_CONFIG.ROOT_X, y: LAYOUT_CONFIG.ROOT_Y },
      type: 'default',
      style: { width: LAYOUT_CONFIG.NODE_WIDTH.TYPE }
    });

    let maxY = LAYOUT_CONFIG.ROOT_Y;

    // Layout main type nodes horizontally with better vertical distribution
    model.typeDefinitions.forEach((typeDef, typeIndex) => {
      const typeNodeId = `type-${nodeId++}`;
      const typeX = LAYOUT_CONFIG.ROOT_X + ((typeIndex + 1) * LAYOUT_CONFIG.LEVEL_SPACING_X);
      const typeY = LAYOUT_CONFIG.ROOT_Y + LAYOUT_CONFIG.NODE_GROUP_SPACING;
      
      // Add type node
      nodes.push({
        id: typeNodeId,
        data: { 
          label: typeDef.name,
          type: 'type'
        },
        position: { x: typeX, y: typeY },
        type: 'default',
        style: { width: LAYOUT_CONFIG.NODE_WIDTH.TYPE }
      });

      // Connect to root with smoothstep edge
      edges.push({
        id: `edge-root-${typeNodeId}`,
        source: rootNodeId,
        target: typeNodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: LAYOUT_CONFIG.COLORS.TYPE_EDGE }
      });

      // Track vertical position for the current type's nodes
      let currentY = typeY + LAYOUT_CONFIG.NODE_GROUP_SPACING;

      // Process relations vertically under each type
      typeDef.relations.forEach((relation) => {
        const relationNodeId = `relation-${nodeId++}`;
        
        // Position relation node
        currentY += LAYOUT_CONFIG.SIBLING_SPACING_Y;
        nodes.push({
          id: relationNodeId,
          data: { 
            label: relation.name,
            type: 'relation'
          },
          position: { 
            x: typeX + LAYOUT_CONFIG.INDENTATION,
            y: currentY
          },
          type: 'default',
          style: { width: LAYOUT_CONFIG.NODE_WIDTH.RELATION }
        });

        // Connect type to relation
        edges.push({
          id: `edge-${typeNodeId}-${relationNodeId}`,
          source: typeNodeId,
          target: relationNodeId,
          type: 'smoothstep',
          style: { 
            stroke: LAYOUT_CONFIG.COLORS.RELATION_EDGE,
            strokeWidth: 2
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: LAYOUT_CONFIG.COLORS.RELATION_EDGE
          }
        });

        // Process relation definitions with better spacing
        const parts = relation.definition.split(' or ');
        parts.forEach(part => {
          const cleanPart = part.trim();
          const definitionNodeId = `def-${nodeId++}`;
          
          // Calculate Y position with proportional spacing
          currentY += LAYOUT_CONFIG.SIBLING_SPACING_Y / 2;

          // Add definition node
          nodes.push({
            id: definitionNodeId,
            data: { 
              label: cleanPart,
              type: 'definition'
            },
            position: { 
              x: typeX + LAYOUT_CONFIG.INDENTATION * 2,
              y: currentY
            },
            type: 'default',
            style: { width: LAYOUT_CONFIG.NODE_WIDTH.DEFINITION }
          });

          // Connect relation to definition
          edges.push({
            id: `edge-${relationNodeId}-${definitionNodeId}`,
            source: relationNodeId,
            target: definitionNodeId,
            type: 'smoothstep',
            style: { 
              stroke: LAYOUT_CONFIG.COLORS.DEFINITION_EDGE,
              strokeWidth: 2
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: LAYOUT_CONFIG.COLORS.DEFINITION_EDGE
            }
          });
        });

        // Add some extra space after the last definition
        currentY += LAYOUT_CONFIG.SIBLING_SPACING_Y / 2;
      });

      // Update maxY for overall graph height
      maxY = Math.max(maxY, currentY);
    });

    return { nodes, edges };
  } catch (error) {
    console.error('Failed to parse authorization model:', error);
    return { nodes: [], edges: [] };
  }
}
