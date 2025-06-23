import { useState, useMemo, Suspense, lazy } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme, Tabs, Tab } from '@mui/material';
import { AppHeader } from './components/AppHeader/AppHeader';
import { OpenFGAService } from './services/OpenFGAService';
import './App.css';

const AuthModelTab = lazy(() => import('./components/AuthModelTab/AuthModelTab'));
const TuplesTab = lazy(() => import('./components/TuplesTab/TuplesTab'));
const QueryTab = lazy(() => import('./components/QueryTab/QueryTab'));

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
          primary: {
            main: '#79ED83', // OpenFGA brand green
            light: '#9FF2A8',
            dark: '#5CE665',
            contrastText: mode === 'dark' ? '#000000' : '#131519',
          },
          secondary: {
            main: mode === 'dark' ? '#BDC4CF' : '#838892', // OpenFGA grays
            light: mode === 'dark' ? '#D3D8DF' : '#BEC3C9',
            dark: mode === 'dark' ? '#838892' : '#131519',
            contrastText: mode === 'dark' ? '#000000' : '#FFFFFF',
          },
          background: {
            default: mode === 'dark' ? '#131519' : '#FAFBFC', // OpenFGA dark gray for dark mode
            paper: mode === 'dark' ? '#000000' : '#FFFFFF', // True black/white from palette
          },
          text: {
            primary: mode === 'dark' ? '#D3D8DF' : '#131519', // OpenFGA light gray / dark gray
            secondary: mode === 'dark' ? '#BEC3C9' : '#838892', // OpenFGA grays
            disabled: mode === 'dark' ? '#838892' : '#BDC4CF',
          },
          divider: mode === 'dark' ? '#838892' : '#BDC4CF', // OpenFGA grays
          action: {
            hover: mode === 'dark' ? 'rgba(121, 237, 131, 0.08)' : 'rgba(121, 237, 131, 0.04)',
            selected: mode === 'dark' ? 'rgba(121, 237, 131, 0.12)' : 'rgba(121, 237, 131, 0.08)',
            disabled: mode === 'dark' ? 'rgba(190, 195, 201, 0.3)' : 'rgba(131, 136, 146, 0.3)',
            disabledBackground: mode === 'dark' ? 'rgba(190, 195, 201, 0.12)' : 'rgba(131, 136, 146, 0.12)',
          },
          error: {
            main: mode === 'dark' ? '#FF6B6B' : '#E53E3E',
            light: mode === 'dark' ? '#FFB3B3' : '#FC8181',
            dark: mode === 'dark' ? '#E53E3E' : '#C53030',
          },
          warning: {
            main: mode === 'dark' ? '#FFD93D' : '#D69E2E',
            light: mode === 'dark' ? '#FFF176' : '#F6E05E',
            dark: mode === 'dark' ? '#FFC107' : '#B7791F',
          },
          success: {
            main: '#79ED83', // Use OpenFGA green for success too
            light: '#9FF2A8',
            dark: '#5CE665',
          },
          info: {
            main: mode === 'dark' ? '#BDC4CF' : '#838892', // Use OpenFGA grays for info
            light: mode === 'dark' ? '#D3D8DF' : '#BDC4CF',
            dark: mode === 'dark' ? '#838892' : '#131519',
          },
        },
        typography: {
          fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          h1: {
            fontWeight: 700,
            letterSpacing: '-0.025em',
          },
          h2: {
            fontWeight: 700,
            letterSpacing: '-0.025em',
          },
          h3: {
            fontWeight: 600,
            letterSpacing: '-0.025em',
          },
          h4: {
            fontWeight: 600,
            letterSpacing: '-0.025em',
          },
          h5: {
            fontWeight: 600,
            letterSpacing: '-0.025em',
          },
          h6: {
            fontWeight: 600,
            letterSpacing: '-0.025em',
          },
          body1: {
            fontSize: '0.875rem',
            lineHeight: 1.57,
          },
          body2: {
            fontSize: '0.8125rem',
            lineHeight: 1.54,
          },
          button: {
            fontWeight: 500,
            textTransform: 'none',
            letterSpacing: '0.025em',
          },
        },
        shape: {
          borderRadius: 12,
        },
        shadows: [
          'none',
          mode === 'dark' 
            ? '0 1px 3px 0 rgba(121, 237, 131, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.3)' 
            : '0 1px 3px 0 rgba(121, 237, 131, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          mode === 'dark'
            ? '0 4px 6px -1px rgba(121, 237, 131, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.3)'
            : '0 4px 6px -1px rgba(121, 237, 131, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          mode === 'dark'
            ? '0 10px 15px -3px rgba(121, 237, 131, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.35)'
            : '0 10px 15px -3px rgba(121, 237, 131, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          mode === 'dark'
            ? '0 20px 25px -5px rgba(121, 237, 131, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
            : '0 20px 25px -5px rgba(121, 237, 131, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          ...Array(20).fill('none'),
        ] as any,
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                textTransform: 'none',
                fontWeight: 500,
                padding: '8px 16px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: mode === 'dark' 
                    ? '0 4px 12px 0 rgba(121, 237, 131, 0.4)' 
                    : '0 4px 12px 0 rgba(121, 237, 131, 0.15)',
                },
              },
              contained: {
                boxShadow: 'none',
                fontWeight: 600,
                '&:hover': {
                  boxShadow: mode === 'dark' 
                    ? '0 4px 12px 0 rgba(121, 237, 131, 0.4)' 
                    : '0 4px 12px 0 rgba(121, 237, 131, 0.25)',
                },
                '&:disabled': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                  color: mode === 'dark' ? 'rgba(255, 255, 255, 0.26)' : 'rgba(0, 0, 0, 0.26)',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                border: mode === 'dark' ? '1px solid rgba(131, 136, 146, 0.3)' : '1px solid rgba(189, 196, 207, 0.6)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: mode === 'dark' ? 'rgba(121, 237, 131, 0.3)' : 'rgba(121, 237, 131, 0.2)',
                },
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#79ED83',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 2,
                    borderColor: '#79ED83',
                    boxShadow: mode === 'dark' 
                      ? '0 0 0 3px rgba(121, 237, 131, 0.15)' 
                      : '0 0 0 3px rgba(121, 237, 131, 0.1)',
                  },
                },
                '& .MuiInputLabel-root': {
                  '&.Mui-focused': {
                    color: '#79ED83',
                  },
                },
                '& .MuiFormHelperText-root': {
                  fontSize: '0.75rem',
                  marginTop: '4px',
                },
                },
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&.Mui-selected': {
                  color: '#79ED83',
                  fontWeight: 600,
                },
                '&:hover': {
                  color: mode === 'dark' ? '#9FF2A8' : '#5CE665',
                },
              },
            },
          },
          MuiTabs: {
            styleOverrides: {
              indicator: {
                height: 3,
                borderRadius: '3px 3px 0 0',
                background: '#79ED83', // Solid OpenFGA green
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'dark' ? 'rgba(19, 21, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderBottom: `1px solid ${mode === 'dark' ? 'rgba(131, 136, 146, 0.3)' : 'rgba(189, 196, 207, 0.6)'}`,
                boxShadow: mode === 'dark' 
                  ? '0 1px 3px 0 rgba(121, 237, 131, 0.1)' 
                  : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              },
            },
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
              <Box sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                px: 3,
                pt: 2,
                pb: 1,
                bgcolor: 'background.default'
              }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': {
                      minHeight: 48,
                      px: 3,
                      py: 1.5,
                    }
                  }}
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
              overflow: 'hidden',
                p: 3,
              gap: 2,
              }}>
              <Box sx={{ 
              flex: 1,
              width: '100%',
                position: 'relative',
              overflow: 'hidden',
              borderRadius: 2,
              bgcolor: 'background.paper',
              boxShadow: 1,
              }}>
              {activeTab === 0 ? (
              <Suspense fallback={
              <Box sx={{ 
                  display: 'flex', 
                    alignItems: 'center', 
                  justifyContent: 'center', 
                height: '100%',
              color: 'text.secondary'
              }}>
              Loading...
              </Box>
              }>
                  <AuthModelTab 
                  storeId={selectedStoreId}
                storeName={selectedStoreName}
              initialModel={authModel}
              onModelUpdate={setAuthModel}
              />
              </Suspense>
              ) : activeTab === 1 ? (
                <Suspense fallback={
                    <Box sx={{ 
                        display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  color: 'text.secondary'
                }}>
                  Loading...
                </Box>
              }>
                <TuplesTab 
                  storeId={selectedStoreId} 
                  currentModel={authModel}
                  authModelId={authModelId}
                />
              </Suspense>
            ) : (
              <Suspense fallback={
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  color: 'text.secondary'
                }}>
                  Loading...
                </Box>
              }>
                <QueryTab
                  storeId={selectedStoreId}
                  currentModel={authModel}
                  authModelId={authModelId}
                />
              </Suspense>
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
