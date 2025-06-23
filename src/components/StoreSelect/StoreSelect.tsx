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
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', maxWidth: 600 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              position: 'fixed',
              right: 16,
              top: 72,
              zIndex: 1400,
              minWidth: 300,
              maxWidth: 500,
              borderRadius: 3,
              boxShadow: 3,
              animation: 'slideIn 0.3s ease-out',
            }}
          >
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 280, flex: 1 }}>
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
              sx={{
                borderRadius: 2,
                bgcolor: 'background.paper',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'divider',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: 2,
                },
              }}
            >
              {stores.length === 0 ? (
                <MenuItem value="" disabled>
                  <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No stores available
                  </Typography>
                </MenuItem>
              ) : (
                stores.map((store) => (
                  <MenuItem key={store.id} value={store.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Typography sx={{ fontWeight: 500 }}>
                        {store.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {store.id}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          
          {loading && (
            <CircularProgress 
              size={20} 
              sx={{ 
                color: 'primary.main'
              }} 
            />
          )}

          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: 'divider',
              minWidth: 80,
              fontWeight: 500,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                borderColor: 'primary.main',
                transform: 'translateY(-1px)',
                boxShadow: 1,
              }
            }}
          >
            🔄 Refresh
          </Button>
          
          <Button
            variant="contained"
            size="small"
            onClick={() => setIsCreateDialogOpen(true)}
            sx={{
              borderRadius: 2,
              minWidth: 100,
              fontWeight: 600,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: 2,
              }
            }}
          >
            ➕ New Store
          </Button>
        </Box>
      </Box>

      <Dialog 
        open={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            borderRadius: 3,
            boxShadow: 4,
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#79ED83', // OpenFGA green
        }}>
          🏪 Create New Store
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Store Name"
            fullWidth
            variant="outlined"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            placeholder="Enter a descriptive name for your store"
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '& fieldset': {
                  borderColor: 'divider'
                },
                '&:hover fieldset': {
                  borderColor: 'primary.main'
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: 2
                }
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => setIsCreateDialogOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: 'divider',
              color: 'text.secondary',
              fontWeight: 500,
              '&:hover': {
                borderColor: 'text.secondary',
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
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              minWidth: 100,
              ml: 1
            }}
          >
            {creatingStore ? '⏳ Creating...' : '✅ Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
