import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { useTheme } from '@mui/material';

interface CustomNodeProps {
  data: {
    label: string;
    type: 'type' | 'relation' | 'definition';
  };
}

export const CustomNode = memo(({ data }: CustomNodeProps) => {
  const theme = useTheme();

  const getTypeStyles = (type: 'type' | 'relation' | 'definition') => {
    const baseStyles = {
      padding: type === 'type' ? '10px 14px' : type === 'relation' ? '8px 12px' : '6px 10px',
      minWidth: type === 'type' ? '140px' : type === 'relation' ? '160px' : '200px',
      fontSize: type === 'definition' ? '13px' : type === 'relation' ? '13.5px' : '14px',
      fontWeight: type === 'type' ? 600 : type === 'relation' ? 500 : 400,
      textAlign: 'center' as const,
      border: '2px solid',
      borderRadius: type === 'type' ? '8px' : '6px',
      color: theme.palette.text.primary,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.2s ease',
      cursor: 'default',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      userSelect: 'none' as const,
      position: 'relative' as const,
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      }
    };

    if (theme.palette.mode === 'dark') {
      return {
        ...baseStyles,
        background: type === 'type' 
          ? theme.palette.primary.dark
          : type === 'relation'
          ? theme.palette.grey[800]
          : theme.palette.success.dark,
        borderColor: type === 'type'
          ? theme.palette.primary.main
          : type === 'relation'
          ? theme.palette.grey[600]
          : theme.palette.success.light,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        '&:hover': {
          ...baseStyles['&:hover'],
          background: type === 'type'
            ? theme.palette.primary.main
            : type === 'relation'
            ? theme.palette.grey[700]
            : theme.palette.success.main,
        }
      };
    }

    return {
      ...baseStyles,
      background: type === 'type' 
        ? '#e3f2fd'
        : type === 'relation'
        ? '#f5f5f5'
        : '#f1f8e9',
      borderColor: type === 'type'
        ? theme.palette.primary.main
        : type === 'relation'
        ? theme.palette.grey[400]
        : theme.palette.success.main,
      '&:hover': {
        ...baseStyles['&:hover'],
        background: type === 'type'
          ? '#bbdefb'
          : type === 'relation'
          ? '#eeeeee'
          : '#dcedc8',
      }
    };
  };

  const handleStyle = {
    background: theme.palette.mode === 'dark' 
      ? theme.palette.grey[400] 
      : theme.palette.grey[700],
    width: 8,
    height: 8,
    borderRadius: '4px',
    border: `2px solid ${theme.palette.background.paper}`,
    zIndex: 1,
  };

  const styles = getTypeStyles(data.type);
  return (
    <div
      style={{
        ...styles,
        margin: '10px 0'
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={handleStyle}
        isConnectable={false}
      />
      {data.label}
      <Handle
        type="source"
        position={Position.Right}
        style={handleStyle}
        isConnectable={false}
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';