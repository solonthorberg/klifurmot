import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Container,
  Grid,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Link } from 'react-router-dom';

import { useCompetitions } from '@/hooks/api/useCompetitions';

export default function HomePage() {
  const { data: competitions, isLoading } = useCompetitions();

  const upcomingCompetitions = competitions?.filter(
    (c) => c.visible && new Date(c.start_date) >= new Date(),
  );

  return (
    <Box>
      <Box>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h2" gutterBottom>
            Klifurmót.is
          </Typography>
          <Typography variant="h5" sx={{ mb: 4 }}>
            Climbing competition management for Iceland
          </Typography>
          <Button
            component={Link}
            to="/competitions"
            variant="contained"
            color="secondary"
            size="large"
          >
            View Competitions
          </Button>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 8 }}>
        <Typography variant="h4" sx={{ mb: 4 }}>
          Upcoming Competitions
        </Typography>

        {isLoading ? (
          <CircularProgress />
        ) : upcomingCompetitions?.length === 0 ? (
          <Typography color="text.secondary">
            No upcoming competitions
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {upcomingCompetitions?.map((competition) => (
              <Grid size={{ xs: 12, sm: 6 }} key={competition.id}>
                <Card component={Link} to={`/competitions/${competition.id}`}>
                  {competition.image && (
                    <CardMedia
                      component="img"
                      height="160"
                      image={competition.image}
                      alt={competition.title}
                    />
                  )}
                  <CardContent>
                    <Typography variant="h6">{competition.title}</Typography>
                    <Typography color="text.secondary">
                      {competition.location}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(competition.start_date).toLocaleDateString(
                        'is-IS',
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
