import React from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  Button,
  Divider,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
};

function CompetitionOverview({ competition }) {
  if (!competition) {
    return (
      <Typography variant="body1">Sæki upplýsingar um mótið...</Typography>
    );
  }

  return (
    <Card sx={{ p: 3 }}>
      <Grid container spacing={4} alignItems="flex-start">
        <Grid item xs={12} md="auto">
          <Box
            sx={{
              width: 200,
              minWidth: 200,
              maxWidth: 200,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Card
              variant="outlined"
              sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}
            >
              {competition.image ? (
                <CardMedia
                  component="img"
                  image={competition.image}
                  alt={competition.title}
                  sx={{ height: 200, objectFit: "cover" }}
                />
              ) : (
                <Box
                  sx={{
                    height: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f0f0f0",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No image available
                  </Typography>
                </Box>
              )}
            </Card>

            <Box display="flex" alignItems="center" mb={1}>
              <LocationOnIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2">{competition.location}</Typography>
            </Box>

            <Box display="flex" alignItems="center">
              <CalendarTodayIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2">
                {formatDate(competition.start_date)} –{" "}
                {formatDate(competition.end_date)}
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2, textTransform: "none" }}
            >
              Taka þátt?
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12} md>
          <Typography variant="h5" gutterBottom>
            {competition.title}
          </Typography>

          <Typography variant="body1" sx={{ mb: 2 }}>
            {competition.description || "Engin lýsing tiltæk."}
          </Typography>

          {competition.requirements && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Undanúrslit
              </Typography>
              <Typography variant="body2">
                {competition.requirements}
              </Typography>
            </>
          )}

          {competition.rules && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Úrslit
              </Typography>
              <Typography variant="body2">{competition.rules}</Typography>
            </>
          )}

          {competition.price && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2">
                <strong>Verð:</strong> {competition.price} kr
              </Typography>
            </>
          )}
        </Grid>
      </Grid>
    </Card>
  );
}

export default CompetitionOverview;
