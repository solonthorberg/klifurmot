import { Link } from 'react-router-dom';
import { Box, Typography, Button, Container } from '@mui/material';

function Home() {
  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
      <Box>
        <Typography variant="h3" component="h1" gutterBottom>
          Klifurmót.is
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 4 }}>
          Rauntímastjórnun móta fyrir klifrara, dómara og stjórnendur.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          component={Link}
          to="/competitions"
        >
          Skoða mót
        </Button>
      </Box>
    </Container>
  );
}

export default Home;