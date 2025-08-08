import { Link } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

const Unauthorized = () => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
        <LockIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Aðgangur bannaður
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Þú hefur ekki aðgang til að fara á þessa síðu. 
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button 
            component={Link}
            to="/"
            variant="contained"
            color="primary"
            fullWidth
          >
            Fara á forsíðu
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Unauthorized;