import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { useTheme } from '@mui/material';

interface CustomNodeProps {
  data: {
    label: string;
    type: 'type' | 'relation' | 'definition' | 'condition';
  };
}

export const CustomNode = memo(({ data }: CustomNodeProps) => {
  const theme = useTheme();

  const getTypeStyles = (type: 'type' | 'relation' | 'definition' | 'condition') => {
    const baseStyles: React.CSSProperties = {
      minHeight: type === 'condition' ? '48px' : type === 'definition' ? '40px' : '30px',
      height: 'auto',
      padding: type === 'condition' ? '12px 16px' : 
               type === 'type' ? '10px 14px' : 
               type === 'relation' ? '8px 12px' : '8px 16px',

      // Layout
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',

      // Text styling
      fontSize: type === 'condition' ? '13px' : '13px',
      fontWeight: type === 'type' ? 600 : type === 'relation' ? 500 : 400,
      color: type === 'condition' ? '#b65800' : theme.palette.text.primary,
      lineHeight: '1.4',
      textAlign: 'center',
      
      // Visual styling
      border: '2px solid',
      borderRadius: type === 'type' ? '8px' : '6px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      cursor: 'default',
      userSelect: 'none',
      transition: 'all 0.2s ease',
    };

    if (theme.palette.mode === 'dark') {
      return {
        ...baseStyles,
        background: type === 'type' 
          ? theme.palette.primary.dark
          : type === 'relation'
          ? theme.palette.grey[800]
          : type === 'condition'
          ? '#fff3e0'
          : theme.palette.success.dark,
        borderColor: type === 'type'
          ? theme.palette.primary.main
          : type === 'relation'
          ? theme.palette.grey[600]
          : type === 'condition'
          ? '#ff9800'
          : theme.palette.success.light,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      };
    }

    return {
      ...baseStyles,
      background: type === 'type' 
        ? '#e3f2fd'
        : type === 'relation'
        ? '#f5f5f5'
        : type === 'condition'
        ? '#fff3e0'
        : '#f1f8e9',
      borderColor: type === 'type'
        ? theme.palette.primary.main
        : type === 'relation'
        ? theme.palette.grey[400]
        : type === 'condition'
        ? '#ff9800'
        : theme.palette.success.main,
    };
  };

  const styles = getTypeStyles(data.type);
  
  const handleStyle: React.CSSProperties = {
    background: '#555',
    width: '8px',
    height: '8px',
    borderRadius: '4px',
    border: '2px solid #fff',
    zIndex: 1,
  };

  return (
    <div style={styles}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ 
          ...handleStyle,
          visibility: data.type === 'type' ? 'hidden' : 'visible',
        }}
      />
      <div style={{ 
        width: '100%',
        overflow: 'visible',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        padding: '4px',
        lineHeight: '1.5',
      }}>
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={handleStyle}
        isConnectable={false}
        id={`${data.type}-${data.label}`}
      />
    </div>
  );
});