import { useState, useMemo } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme, Tabs, Tab } from '@mui/material';
import { AppHeader } from './components/AppHeader/AppHeader';
import { AuthModelTab } from './components/AuthModelTab/AuthModelTab';
import { TuplesTab } from './components/TuplesTab/TuplesTab';
import { OpenFGAService } from './services/OpenFGAService';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const [authModel, setAuthModel] = useState('');

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          background: {
            default: mode === 'dark' ? '#121212' : '#f5f5f5',
            paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
      }),
    [mode]
  );

  const handleStoreChange = async (storeId: string) => {
    setSelectedStoreId(storeId);
    try {
      const model = await OpenFGAService.getAuthorizationModel(storeId);
      setAuthModel(model);
    } catch (error) {
      console.error('Failed to fetch authorization model:', error);
      setAuthModel('');
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary'
      }}>
        <AppHeader
          selectedStore={selectedStoreId}
          onStoreChange={handleStoreChange}
          onToggleTheme={() => setMode(mode === 'light' ? 'dark' : 'light')}
        />
        
        <Box sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedStoreId && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                  <Tab label="Authorization Model" />
                  <Tab label="Tuples" />
                </Tabs>
              </Box>

              <Box sx={{ flex: 1, display: 'flex' }}>
                {activeTab === 0 ? (
                  <AuthModelTab 
                    storeId={selectedStoreId}
                    initialModel={authModel}
                    onModelUpdate={setAuthModel}
                  />
                ) : (
                  <TuplesTab storeId={selectedStoreId} />
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
