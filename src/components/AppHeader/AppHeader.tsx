import { AppBar, Toolbar, Typography, Box, IconButton, useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { StoreSelect } from '../StoreSelect/StoreSelect';

interface AppHeaderProps {
  selectedStore: string;
  onStoreChange: (storeId: string) => void;
  onToggleTheme: () => void;
}

export const AppHeader = ({ selectedStore, onStoreChange, onToggleTheme }: AppHeaderProps) => {
  const theme = useTheme();

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
          OpenFGA Playground
        </Typography>
        <Box sx={{ flexGrow: 1 }}>
          <StoreSelect
            selectedStore={selectedStore}
            onStoreChange={onStoreChange}
          />
        </Box>
        <IconButton onClick={onToggleTheme} color="inherit">
          {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};
