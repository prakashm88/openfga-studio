import { useState, useMemo } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme, Tabs, Tab } from '@mui/material';
import { AppHeader } from './components/AppHeader/AppHeader';
import { AuthModelTab } from './components/AuthModelTab/AuthModelTab';
import { TuplesTab } from './components/TuplesTab/TuplesTab';
import { OpenFGAService } from './services/OpenFGAService';
import { QueryTab } from './components/QueryTab/QueryTab';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedStoreName, setSelectedStoreName] = useState('');
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const [authModel, setAuthModel] = useState('');
  const [authModelId, setAuthModelId] = useState('');

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

  const handleStoreChange = async (storeId: string, storeName: string) => {
    setSelectedStoreId(storeId);
    setSelectedStoreName(storeName);
    try {
      const { model, modelId } = await OpenFGAService.getAuthorizationModel(storeId);
      setAuthModel(model);
      setAuthModelId(modelId || '');
    } catch (error) {
      console.error('Failed to fetch authorization model:', error);
      setAuthModel('');
      setAuthModelId('');
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
        height: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        overflow: 'hidden' // Prevent scrolling at root
      }}>
        <AppHeader
          selectedStore={selectedStoreId}
          onStoreChange={handleStoreChange}
          onToggleTheme={() => setMode(mode === 'light' ? 'dark' : 'light')}
        />
        
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedStoreId && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab label="Authorization Model" />
                  <Tab label="Tuples" />
                  <Tab label="Query" />
                </Tabs>
              </Box>

              <Box sx={{ 
                flex: 1, 
                display: 'flex',
                width: '100%',
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  flex: 1,
                  width: '100%',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {activeTab === 0 ? (
                    <AuthModelTab 
                      storeId={selectedStoreId}
                      storeName={selectedStoreName}
                      initialModel={authModel}
                      authModelId={authModelId}
                      onModelUpdate={setAuthModel}
                    />
                  ) : activeTab === 1 ? (
                    <TuplesTab 
                      storeId={selectedStoreId} 
                      currentModel={authModel}
                      authModelId={authModelId}
                    />
                  ) : (
                    <QueryTab
                      storeId={selectedStoreId}
                      currentModel={authModel}
                      authModelId={authModelId}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
