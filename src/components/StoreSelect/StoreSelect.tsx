import { useState, useEffect } from 'react';
import { Box, Select, MenuItem, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { OpenFGAService } from '../../services/OpenFGAService';

interface StoreSelectProps {
  selectedStore: string;
  onStoreChange: (storeId: string) => void;
}

export const StoreSelect = ({ selectedStore, onStoreChange }: StoreSelectProps) => {
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadStores = async () => {
    try {
      const storesData = await OpenFGAService.listStores();
      setStores(storesData.stores);
      if (storesData.stores.length > 0 && !selectedStore) {
        onStoreChange(storesData.stores[0].id);
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const handleCreateStore = async () => {
    if (!newStoreName) return;
    setIsLoading(true);
    try {
      const store = await OpenFGAService.createStore(newStoreName);
      await loadStores();
      onStoreChange(store.id);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create store:', error);
    } finally {
      setIsLoading(false);
      setNewStoreName('');
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
      <Select
        value={selectedStore || ''}
        onChange={(e) => onStoreChange(e.target.value)}
        sx={{ minWidth: 200 }}
        displayEmpty
      >
        <MenuItem value="" disabled>Select a store</MenuItem>
        {stores.map((store) => (
          <MenuItem key={store.id} value={store.id}>
            {store.name}
          </MenuItem>
        ))}
      </Select>
      
      <Button variant="contained" onClick={() => setIsCreateDialogOpen(true)}>
        Create Store
      </Button>

      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
        <DialogTitle>Create New Store</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Store Name"
            fullWidth
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            disabled={isLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateStore} disabled={isLoading || !newStoreName}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
