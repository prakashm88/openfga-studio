import { useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange 
} from 'reactflow';
import 'reactflow/dist/style.css';

interface AuthModelGraphProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
}

export const AuthModelGraph = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}: AuthModelGraphProps) => {

  return (
    <div style={{ height: '400px', border: '1px solid #ccc' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};
