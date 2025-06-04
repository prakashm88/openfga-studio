import ReactFlow, { 
  Background, 
  Controls,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange 
} from 'reactflow';
import { CustomNode } from './CustomNode';
import 'reactflow/dist/style.css';

const nodeTypes = {
  default: CustomNode,
};

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
    <div style={{ width: '100%', height: '700px' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          style={{ background: '#f8f8f8' }}
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};
