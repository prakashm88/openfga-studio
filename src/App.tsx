import { useState } from 'react';
import { Container, Box, Typography, Tab, Tabs } from '@mui/material';
import { StoreSelect } from './components/StoreSelect/StoreSelect';
import { AuthModelTab } from './components/AuthModelTab/AuthModelTab';
import { TuplesTab } from './components/TuplesTab/TuplesTab';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [authModel, setAuthModel] = useState(`# OpenFGA Authorization Model
schema_version: 1.1
type_definitions:
  - type: user
  - type: document
    relations:
      reader:
        union:
          child:
            - this: writer
      writer:
        this: {}`);

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
