import { useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { useTheme } from '@mui/material';

interface AuthModelEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const AuthModelEditor = ({ value, onChange }: AuthModelEditorProps) => {
  const theme = useTheme();

  useEffect(() => {
    loader.init().then(monacoInstance => {
      monacoInstance.editor.defineTheme('custom-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': theme.palette.background.paper
        }
      });
    });
  }, [theme.palette.background.paper]);

  return (
    <div style={{ height: '600px', border: `1px solid ${theme.palette.divider}` }}>
      <Editor
        height="100%"
        defaultLanguage="yaml"
        value={value}
        onChange={(value) => onChange(value || '')}
        theme={theme.palette.mode === 'dark' ? 'custom-dark' : 'light'}
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
