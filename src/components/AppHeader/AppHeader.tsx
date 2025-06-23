import { AppBar, Toolbar, Typography, Box, IconButton, useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { StoreSelect } from '../StoreSelect/StoreSelect';

interface AppHeaderProps {
  selectedStore: string;
  onStoreChange: (storeId: string, storeName: string) => void;
  onToggleTheme: () => void;
}

export const AppHeader = ({ selectedStore, onStoreChange, onToggleTheme }: AppHeaderProps) => {
  const theme = useTheme();

  return (
    <AppBar position="static" color="default" elevation={0}>
      <Toolbar sx={{ minHeight: 64, px: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mr: 3,
          gap: 2,
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: 1,
          }}>
            <img 
              src="/openfga.svg" 
              alt="OpenFGA Logo" 
              style={{ 
                height: 24, 
                width: 24,
                filter: theme.palette.mode === 'dark' ? 'invert(1)' : 'none'
              }} 
            />
          </Box>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 700,
              color: '#79ED83', // OpenFGA green
              letterSpacing: '-0.025em',
            }}
          >
            OpenFGA Studio
          </Typography>
        </Box>
        
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', maxWidth: 600 }}>
          <StoreSelect
            selectedStore={selectedStore}
            onStoreChange={onStoreChange}
          />
        </Box>
        
        <IconButton 
          onClick={onToggleTheme} 
          color="inherit"
          sx={{
            borderRadius: 2,
            width: 40,
            height: 40,
            bgcolor: 'action.hover',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              transform: 'scale(1.05)',
            }
          }}
        >
          {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};
