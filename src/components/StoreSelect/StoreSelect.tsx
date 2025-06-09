import { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Box, 
  CircularProgress, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Alert, 
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography
} from '@mui/material';
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
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        color: 'text.secondary' 
      }}>
        <CircularProgress size={20} />
        <Typography>Loading stores...</Typography>
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
              boxShadow: (theme) => theme.shadows[3],
              animation: 'slideIn 0.3s ease-out',
            }}
          >
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={selectedStore || ''}
              onChange={(e) => {
                const selectedStore = stores.find(s => s.id === e.target.value);
                if (selectedStore) {
                  onStoreChange(selectedStore.id, selectedStore.name);
                }
              }}
              disabled={loading}
              displayEmpty
            >
              {stores.length === 0 ? (
                <MenuItem value="" disabled>No stores available</MenuItem>
              ) : (
                stores.map((store) => (
                  <MenuItem key={store.id} value={store.id}>
                    <Typography>
                      {store.name} <Typography component="span" color="text.secondary">({store.id})</Typography>
                    </Typography>
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          
          {loading && <CircularProgress size={16} />}

          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'divider',
              '&:hover': {
                borderColor: 'primary.main'
              }
            }}
          >
            Refresh
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            onClick={() => setIsCreateDialogOpen(true)}
            sx={{
              borderColor: 'divider',
              '&:hover': {
                borderColor: 'primary.main'
              }
            }}
          >
            New Store
          </Button>
        </Box>
      </Box>

      <Dialog 
        open={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none'
          }
        }}
      >
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
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'divider'
                }
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsCreateDialogOpen(false)}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateStore}
            disabled={!newStoreName.trim() || creatingStore}
            variant="contained"
          >
            {creatingStore ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
