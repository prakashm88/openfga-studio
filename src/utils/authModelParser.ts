import { type Node, type Edge, MarkerType } from 'reactflow';
import type { AuthModel, OpenFGAModel, TypeDefinition } from '../types/models';

function splitDefinitions(definition: string): string[] {
  const parts: string[] = [];
  let currentPart = '';
  let bracketCount = 0;
  
  for (let i = 0; i < definition.length; i++) {
    const char = definition[i];
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;
    
    if (bracketCount === 0 && i >= 2 && definition.slice(i - 2, i + 1) === ' or') {
      // Remove the trailing 'o' if it exists
      parts.push(currentPart.slice(0, -1).trim());
      currentPart = '';
      i++; // Skip the 'r' in 'or'
    } else {
      currentPart += char;
    }
  }
  if (currentPart) parts.push(currentPart.trim());
  return parts.length ? parts : [definition.trim()];
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
      schemaVersion: "1.1",
      typeDefinitions: [],
      conditions: [],
    };

    let currentType: TypeDefinition | null = null;

    for (const line of lines) {
      if (line.startsWith('model')) continue;
      if (line.startsWith('schema')) {
        model.schemaVersion = line.split(' ')[1];
        continue;
      }
      if (line.startsWith("condition ")) {
        const conditionMatch = line.match(/condition\s+(\w+)\s*\((.*?)\)\s*{(.*?)}/);
        if (conditionMatch) {
          const [, name, parameters, expression] = conditionMatch;
          model.conditions?.push({
            name,
            parameters,
            expression: expression.trim(),
          });
        }
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
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const name = line.substring(7, colonIndex).trim();
          const definition = line.substring(colonIndex + 1).trim();
          currentType.relations.push({ name, definition });
        }
      }
    }

    if (currentType) {
      model.typeDefinitions.push(currentType);
    }

    return model;
  }
}

const LAYOUT_CONFIG = {
  ROOT_X: 100,
  ROOT_Y: 80,
  LEVEL_SPACING_X: 600,
  SIBLING_SPACING_Y: 220,
  NODE_GROUP_SPACING: 180,
  INDENTATION: 200,
  NODE_WIDTH: {
    TYPE: 160,
    RELATION: 180,
    DEFINITION: 240
  },
  NODE_HEIGHT: 50,
  PADDING: 60,
  COLORS: {
    TYPE_EDGE: '#2684ff',
    RELATION_EDGE: '#4caf50',
    DEFINITION_EDGE: '#ff9800',
    CONDITION_EDGE: '#ff9800'
  },
  LEGEND: [
    { label: 'Type', color: '#2684ff' },
    { label: 'Relation', color: '#4caf50' },
    { label: 'Definition', color: '#ff9800' },
    { label: 'Condition', color: '#ff9800' }
  ]
};

export function parseAuthModelToGraph(dslContent: string, storeName?: string): { nodes: Node[]; edges: Edge[] } {
  try {
    const model = parseDSL(dslContent);
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 1;

    if (storeName) {
      storeName = storeName.charAt(0).toUpperCase() + storeName.slice(1);
    }
    
    // Add root node
    const rootNodeId = 'root';
    nodes.push({
      id: rootNodeId,
      data: { 
        label: storeName ? `${storeName} Authorization Model` : 'Authorization Model',
        type: 'type'
      },
      position: { x: LAYOUT_CONFIG.ROOT_X, y: LAYOUT_CONFIG.ROOT_Y },
      type: 'default',
      style: { width: LAYOUT_CONFIG.NODE_WIDTH.TYPE }
    });

    let maxY = LAYOUT_CONFIG.ROOT_Y;

    // Layout type nodes
    model.typeDefinitions.forEach((typeDef, typeIndex) => {
      const typeNodeId = `type-${nodeId++}`;
      const typeX = LAYOUT_CONFIG.ROOT_X + ((typeIndex + 1) * LAYOUT_CONFIG.LEVEL_SPACING_X);
      const typeY = LAYOUT_CONFIG.ROOT_Y + LAYOUT_CONFIG.NODE_GROUP_SPACING;
      
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

      edges.push({
        id: `edge-root-${typeNodeId}`,
        source: rootNodeId,
        target: typeNodeId,
        targetHandle: `type-${typeDef.name}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: LAYOUT_CONFIG.COLORS.TYPE_EDGE }
      });

      let currentY = typeY + LAYOUT_CONFIG.NODE_GROUP_SPACING;

      // Process relations
      typeDef.relations.forEach((relation) => {
        const relationNodeId = `relation-${nodeId++}`;
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

        // Process definitions
        const definitions = splitDefinitions(relation.definition);
        definitions.forEach(def => {
          const cleanDef = def.trim();
          const definitionNodeId = `def-${nodeId++}`;
          currentY += LAYOUT_CONFIG.SIBLING_SPACING_Y / 2;

          const hasCondition = cleanDef.includes(' with ');
          
          nodes.push({
            id: definitionNodeId,
            data: { 
              label: cleanDef,
              type: hasCondition ? 'condition' : 'definition'
            },
            position: { 
              x: typeX + LAYOUT_CONFIG.INDENTATION * 2,
              y: currentY
            },
            type: 'default',
            style: { 
              width: LAYOUT_CONFIG.NODE_WIDTH.DEFINITION,
              ...(hasCondition && { border: '2px solid #ff9800' })
            }
          });

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

        currentY += LAYOUT_CONFIG.SIBLING_SPACING_Y / 2;
      });

      maxY = Math.max(maxY, currentY);
    });

    return { nodes, edges };
  } catch (error) {
    console.error('Failed to parse authorization model:', error);
    return { nodes: [], edges: [] };
  }
}
