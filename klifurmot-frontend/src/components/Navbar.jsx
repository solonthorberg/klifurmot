import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import InfoIcon from '@mui/icons-material/Info';
import DashboardIcon from '@mui/icons-material/Dashboard';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

function Navbar() {
  const { isLoggedIn, logout, isAdmin, username } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const navigationItems = [
    { label: 'Mót', path: '/competitions', icon: EmojiEventsIcon },
    { label: 'Keppendur', path: '/athletes', icon: PeopleIcon },
    { label: 'Um Okkur', path: '/about', icon: InfoIcon },
    ...(isAdmin ? [{ label: 'Stjórnborð', path: '/controlpanel', icon: DashboardIcon }] : [])
  ];

  const handleLogout = () => {
    logout();
    setDrawerOpen(false);
  };

  const drawerContent = (
    <Box
      sx={{ 
        width: 280,
        height: '100%',
        background: '#60B5FF',
        color: 'white'
      }}
      role="presentation"
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 2,
        borderBottom: '1px solid rgba(255,255,255,0.2)'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Klifurmót
        </Typography>
        <IconButton 
          onClick={toggleDrawer(false)}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <List sx={{ pt: 2 }}>
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={toggleDrawer(false)}
                sx={{
                  py: 1.5,
                  px: 3,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                <IconComponent sx={{ mr: 2 }} />
                <ListItemText 
                  primary={item.label}
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontSize: '1.1rem',
                      fontWeight: 500
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        {isLoggedIn ? (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/profile"
                onClick={toggleDrawer(false)}
                sx={{
                  py: 1.5,
                  px: 3,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                <PersonIcon sx={{ mr: 2 }} />
                <ListItemText 
                  primary={username}
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontSize: '1.1rem',
                      fontWeight: 500
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  py: 1.5,
                  px: 3,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                <LogoutIcon sx={{ mr: 2 }} />
                <ListItemText 
                  primary="Útskrá"
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontSize: '1.1rem',
                      fontWeight: 500
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/login"
              onClick={toggleDrawer(false)}
              sx={{
                py: 1.5,
                px: 3,
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }
              }}
            >
              <LoginIcon sx={{ mr: 2 }} />
              <ListItemText 
                primary="Innskrá"
                sx={{ 
                  '& .MuiListItemText-primary': {
                    fontSize: '1.1rem',
                    fontWeight: 500
                  }
                }}
              />
            </ListItemButton>
          </ListItem>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ 
        backgroundColor: '#60B5FF', }}>
        <Toolbar sx={{ minHeight: { xs: 64, sm: 64, md: 64 } }}>
          <Typography 
            variant="h6" 
            component={Link} 
            to="/" 
            sx={{ 
              textDecoration: 'none', 
              color: 'inherit',
              fontWeight: 'bold',
              flexGrow: isMobile ? 1 : 0,
              mr: isMobile ? 0 : 4,
              fontSize: { xs: '1.25rem', sm: '1.25rem', md: '1.25rem' }
            }}
          >
            Klifurmót
          </Typography>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Button 
                    key={item.path}
                    color="inherit" 
                    component={Link} 
                    to={item.path}
                    startIcon={<IconComponent />}
                    sx={{ 
                      textTransform: 'none',
                      fontSize: { xs: '0.875rem', sm: '0.875rem', md: '0.875rem' },
                      minHeight: { xs: 48, sm: 48, md: 48 },
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      }
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          )}

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isLoggedIn ? (
                <>
                  <Button 
                    color="inherit" 
                    onClick={logout}
                    startIcon={<LogoutIcon />}
                    sx={{ 
                      textTransform: 'none',
                      fontSize: { xs: '0.875rem', sm: '0.875rem', md: '0.875rem' },
                      minHeight: { xs: 48, sm: 48, md: 48 },
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      }
                    }}
                  >
                    Útskrá
                  </Button>
                  <Button 
                    color="inherit" 
                    component={Link} 
                    to="/profile"
                    startIcon={<PersonIcon />}
                    sx={{ 
                      textTransform: 'none',
                      fontSize: { xs: '0.875rem', sm: '0.875rem', md: '0.875rem' },
                      minHeight: { xs: 48, sm: 48, md: 48 },
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      }
                    }}
                  >
                    {username}
                  </Button>
                </>
              ) : (
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/login"
                  startIcon={<LoginIcon />}
                  sx={{ 
                    textTransform: 'none',
                    fontSize: { xs: '0.875rem', sm: '0.875rem', md: '0.875rem' },
                    minHeight: { xs: 48, sm: 48, md: 48 },
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    }
                  }}
                >
                  Innskrá
                </Button>
              )}
            </Box>
          )}

          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={toggleDrawer(true)}
              sx={{
                minWidth: 48,
                minHeight: 48,
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        sx={{
          '& .MuiDrawer-paper': {
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

export default Navbar;