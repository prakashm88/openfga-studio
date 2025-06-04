import { memo } from 'react';
import { Handle, Position } from 'reactflow';

interface CustomNodeProps {
  data: {
    label: string;
    type: 'type' | 'relation' | 'definition';
  };
}

const typeStyles = {
  type: {
    background: '#d4e8fd',
    border: '1px solid #2684ff',
    borderRadius: '8px',
    padding: '10px',
    minWidth: '100px',
    textAlign: 'center' as const,
  },
  relation: {
    background: '#f3f3f3',
    border: '1px solid #999',
    borderRadius: '4px',
    padding: '8px',
    minWidth: '80px',
    textAlign: 'center' as const,
  },
  definition: {
    background: '#e6ffe6',
    border: '1px solid #4caf50',
    borderRadius: '4px',
    padding: '6px',
    fontSize: '12px',
    minWidth: '120px',
    textAlign: 'center' as const,
  },
};

export const CustomNode = memo(({ data }: CustomNodeProps) => {
  return (
    <div style={typeStyles[data.type]}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555' }}
      />
      {data.label}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555' }}
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';