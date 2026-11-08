import dagre from '@dagrejs/dagre';
import type { Edge, Node } from 'reactflow';
import type { GraphViewNode } from './types';

const NODE_HEIGHT = 50;
const MIN_NODE_WIDTH = 120;
const MAX_NODE_WIDTH = 320;

function nodeWidth(node: GraphViewNode): number {
  const width = node.style?.width;
  if (typeof width === 'number') {
    return width;
  }
  const label = String(node.data?.label ?? node.id);
  return Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, label.length * 8 + 48));
}

/** Gives a position to each node that has none, with a left-to-right layered layout. */
export function layoutGraph(nodes: GraphViewNode[], edges: Edge[]): Node[] {
  if (nodes.every((node) => node.position)) {
    return nodes as Node[];
  }

  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 140 });
  graph.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) {
    graph.setNode(node.id, { width: nodeWidth(node), height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }
  dagre.layout(graph);

  return nodes.map((node) => {
    if (node.position) {
      return node as Node;
    }
    const { x, y, width, height } = graph.node(node.id);
    // Set the width on the node too, so that the rendered node matches the layout.
    return {
      ...node,
      style: { width, ...node.style },
      position: { x: x - width / 2, y: y - height / 2 },
    };
  });
}
