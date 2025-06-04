import { useState } from 'react';
import { Container, Box, Typography, Tab, Tabs } from '@mui/material';
import { StoreSelect } from './components/StoreSelect/StoreSelect';
import { AuthModelTab } from './components/AuthModelTab/AuthModelTab';
import { TuplesTab } from './components/TuplesTab/TuplesTab';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [authModel, setAuthModel] = useState(`model
  schema 1.1

type user

type group
  relations
    define member: [user]

type folder
  relations
    define can_create_file: owner
    define owner: [user]
    define parent: [folder]
    define viewer: [user, user:*, group#member] or owner or viewer from parent

type doc
  relations
    define can_change_owner: owner
    define owner: [user]
    define parent: [folder]
    define can_read: viewer or owner or viewer from parent
    define can_share: owner or owner from parent
    define viewer: [user, user:*, group#member]
    define can_write: owner or owner from parent
`);

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        OpenFGA Playground
      </Typography>

      <StoreSelect
        selectedStore={selectedStoreId}
        onStoreChange={setSelectedStoreId}
      />

      {selectedStoreId && (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab label="Authorization Model" />
              <Tab label="Tuples" />
            </Tabs>
          </Box>

          <Box>
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
        </>
      )}
    </Container>
  );
}

export default App
