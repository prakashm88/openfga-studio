import { useState, useEffect, useCallback } from 'react';
import { Button, Box, CircularProgress, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import { OpenFGAService } from '../../services/OpenFGAService';

interface Store {
  id: string;
  name: string;
}

interface StoreSelectProps {
  selectedStore?: string;
  onStoreChange: (storeId: string, storeName: string) => void;
}

export const StoreSelect = ({ selectedStore, onStoreChange }: StoreSelectProps) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);

  const loadStores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const storesList = await OpenFGAService.listStores();
      setStores(storesList);

      // If we have stores but none selected, select the first one
      if (storesList.length > 0 && !selectedStore) {
        onStoreChange(storesList[0].id, storesList[0].name);
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stores. Please try again.');
      setStores([]); // Ensure stores is always an array
    } finally {
      setLoading(false);
    }
  }, [selectedStore, onStoreChange]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return;

    try {
      setCreatingStore(true);
      setError(null);
      await OpenFGAService.createStore(newStoreName.trim());
      setNewStoreName('');
      setIsCreateDialogOpen(false);
      await loadStores(); // Reload stores after creating new one
    } catch (error) {
      console.error('Failed to create store:', error);
      setError('Failed to create store. Please try again.');
    } finally {
      setCreatingStore(false);
    }
  };

  const handleRefresh = () => {
    loadStores();
  };

  if (loading && stores.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={20} />
        <span>Loading stores...</span>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 200 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              position: 'fixed',
              right: 16,
              top: 72,
              zIndex: 1400,
              minWidth: 300,
              boxShadow: 3,
              animation: 'slideIn 0.3s ease-out',
            }}
          >
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <select
            value={selectedStore || ''}
            onChange={(e) => {
              const selectedStore = stores.find(s => s.id === e.target.value);
              if (selectedStore) {
                onStoreChange(selectedStore.id, selectedStore.name);
              }
            }}
            disabled={loading}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              minWidth: '200px'
            }}
          >
            {stores.length === 0 ? (
              <option value="">No stores available</option>
            ) : (
              stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.id})
                </option>
              ))
            )}
          </select>
          
          {loading && <CircularProgress size={16} />}

          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            size="small"
            variant="outlined"
          >
            Refresh
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            New Store
          </Button>
        </Box>
      </Box>

      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
        <DialogTitle>Create New Store</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Store Name"
            fullWidth
            variant="outlined"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateStore}
            disabled={!newStoreName.trim() || creatingStore}
          >
            {creatingStore ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
