import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

interface AuthModelEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const AuthModelEditor = ({ value, onChange }: AuthModelEditorProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{ height: '600px', border: '1px solid #ccc' }}>
      <Editor
        height="100%"
        defaultLanguage="yaml"
        value={value}
        onChange={(value) => onChange(value || '')}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: 'on'
        }}
      />
    </div>
  );
};
