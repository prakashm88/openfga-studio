import { parse } from 'yaml';
import type { Node, Edge } from 'reactflow';

export interface AuthModel {
  schema_version: string;
  type_definitions: Array<{
    type: string;
    relations?: Record<string, {
      this?: string;
      union?: {
        child: string[];
      };
      computedUserset?: {
        relation: string;
      };
    }>;
  }>;
}

export function parseAuthModelToGraph(yamlContent: string): { nodes: Node[]; edges: Edge[] } {
  try {
    const model = parse(yamlContent) as AuthModel;
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 1;

    // Create nodes for each type
    model.type_definitions.forEach((typeDef) => {
      nodes.push({
        id: `type-${nodeId}`,
        type: 'default',
        position: { x: 100, y: nodeId * 100 }, // Simple positioning
        data: { label: typeDef.type },
      });

      // Process relations
      if (typeDef.relations) {
        Object.entries(typeDef.relations).forEach(([relation, def]) => {
          nodeId++;
          const relationNodeId = `relation-${nodeId}`;
          nodes.push({
            id: relationNodeId,
            type: 'default',
            position: { x: 300, y: nodeId * 100 },
            data: { label: relation },
          });

          // Add edge from type to relation
          edges.push({
            id: `edge-${nodeId}`,
            source: `type-${nodeId - 1}`,
            target: relationNodeId,
            type: 'default',
          });

          // Process relation definitions
          if (def.this) {
            nodeId++;
            nodes.push({
              id: `this-${nodeId}`,
              type: 'default',
              position: { x: 500, y: nodeId * 100 },
              data: { label: 'this' },
            });
            edges.push({
              id: `edge-${nodeId}`,
              source: relationNodeId,
              target: `this-${nodeId}`,
              type: 'default',
            });
          }

          if (def.union?.child) {
            def.union.child.forEach((child) => {
              nodeId++;
              nodes.push({
                id: `child-${nodeId}`,
                type: 'default',
                position: { x: 500, y: nodeId * 100 },
                data: { label: child },
              });
              edges.push({
                id: `edge-${nodeId}`,
                source: relationNodeId,
                target: `child-${nodeId}`,
                type: 'default',
              });
            });
          }

          if (def.computedUserset?.relation) {
            nodeId++;
            nodes.push({
              id: `computed-${nodeId}`,
              type: 'default',
              position: { x: 500, y: nodeId * 100 },
              data: { label: def.computedUserset.relation },
            });
            edges.push({
              id: `edge-${nodeId}`,
              source: relationNodeId,
              target: `computed-${nodeId}`,
              type: 'default',
            });
          }
        });
      }
      nodeId++;
    });

    return { nodes, edges };
  } catch (error) {
    console.error('Failed to parse authorization model:', error);
    return { nodes: [], edges: [] };
  }
}
