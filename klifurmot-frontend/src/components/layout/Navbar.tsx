import {
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  EmojiEvents as EmojiEventsIcon,
  Info as InfoIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';

export default function Navbar() {
  const { isAuthenticated, clearTokens, user, profile } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const toggleDrawer =
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event.type === 'keydown' &&
        ((event as React.KeyboardEvent).key === 'Tab' ||
          (event as React.KeyboardEvent).key === 'Shift')
      ) {
        return;
      }
      setDrawerOpen(open);
    };

  const navigationItems = [
    { label: 'Mót', path: '/competitions', icon: EmojiEventsIcon },
    { label: 'Keppendur', path: '/athletes', icon: PeopleIcon },
    { label: 'Um Okkur', path: '/about', icon: InfoIcon },
    ...(profile?.is_admin
      ? [{ label: 'Stjórnborð', path: '/controlpanel', icon: DashboardIcon }]
      : []),
  ];

  const handleLogout = () => {
    clearTokens();
    setDrawerOpen(false);
  };

  const drawerContent = (
    <Box
      sx={{
        width: 280,
        height: '100%',
        background: '#60B5FF',
        color: 'white',
      }}
      role="presentation"
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Klifurmót
        </Typography>
        <IconButton onClick={toggleDrawer(false)} sx={{ color: 'white' }}>
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
                  },
                }}
              >
                <IconComponent sx={{ mr: 2 }} />
                <ListItemText
                  primary={item.label}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '1.1rem',
                      fontWeight: 500,
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        {isAuthenticated ? (
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
                  },
                }}
              >
                <PersonIcon sx={{ mr: 2 }} />
                <ListItemText
                  primary={user?.username}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '1.1rem',
                      fontWeight: 500,
                    },
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
                  },
                }}
              >
                <LogoutIcon sx={{ mr: 2 }} />
                <ListItemText
                  primary="Útskrá"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '1.1rem',
                      fontWeight: 500,
                    },
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
                },
              }}
            >
              <LoginIcon sx={{ mr: 2 }} />
              <ListItemText
                primary="Innskrá"
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '1.1rem',
                    fontWeight: 500,
                  },
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
      <AppBar position="static" sx={{ backgroundColor: '#60B5FF' }}>
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
              fontSize: { xs: '1.25rem', sm: '1.25rem', md: '1.25rem' },
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
                      fontSize: '0.875rem',
                      minHeight: 48,
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
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
              {isAuthenticated ? (
                <>
                  <Button
                    color="inherit"
                    onClick={clearTokens}
                    startIcon={<LogoutIcon />}
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      minHeight: 48,
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
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
                      fontSize: '0.875rem',
                      minHeight: 48,
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    {user?.username}
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
                    fontSize: '0.875rem',
                    minHeight: 48,
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
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
                },
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
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
