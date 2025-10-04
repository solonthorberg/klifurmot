import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import PersonIcon from "@mui/icons-material/Person";

function AthletesDetails() {
  const { id } = useParams();
  const [athlete, setAthlete] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAthlete = async () => {
      try {
        const res = await api.get(`/athletes/public-climbers/${id}/`);
        setAthlete(res.data);
        console.log(res);
      } catch (err) {
        console.error("Error fetching athlete:", err);
        setError("Ekki tókst að sækja keppandann.");
      }
    };

    if (id) {
      fetchAthlete();
    }
  }, [id]);

  const getHighestRoundOnly = (results) => {
    if (!results || !Array.isArray(results) || results.length === 0)
      return null;

    return results.reduce((highest, current) => {
      return current.round_order > highest.round_order ? current : highest;
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "–";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (error) {
    return (
      <Box maxWidth="lg" sx={{ mx: "auto", mt: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!athlete) {
    return (
      <Box maxWidth="lg" sx={{ mx: "auto", textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Hleður inn gögnum...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ textAlign: "center" }}>
          <Avatar
            src={athlete.profile_picture || undefined}
            sx={{
              width: 150,
              height: 150,
              mx: "auto",
              mb: 2,
              bgcolor: "grey.300",
            }}
          >
            {!athlete.profile_picture && <PersonIcon sx={{ fontSize: 80 }} />}
          </Avatar>

          <Typography variant="h4" component="h1" gutterBottom>
            {athlete.full_name}
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              mt: 3,
            }}
          >
            <Box>
              <Typography variant="body2" color="textSecondary">
                Aldur: {athlete.age || "–"}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Hæð: {athlete.height_cm ? `${athlete.height_cm} cm` : "–"}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Vænghaf:{" "}
                {athlete.wingspan_cm ? `${athlete.wingspan_cm} cm` : "–"}
              </Typography>
            </Box>

            <Box />

            <Box>
              <Typography variant="body2" color="textSecondary">
                Flokkur: {athlete.category || "–"}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Mótaþátttaka: {athlete.competitions_count || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Sigrar: {athlete.wins_count || 0}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {athlete.competition_results &&
        athlete.competition_results.length > 0 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Mót</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Flokkur</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Dagsetning</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Árangur</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {athlete.competition_results.map((competition) => {
                  const bestResult = getHighestRoundOnly(competition.results);
                  return (
                    <TableRow key={competition.id}>
                      <TableCell>{competition.title}</TableCell>
                      <TableCell>{competition.category}</TableCell>
                      <TableCell>
                        {formatDate(competition.start_date)}
                      </TableCell>
                      <TableCell>
                        {bestResult ? bestResult.rank : "–"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

      {(!athlete.competition_results ||
        athlete.competition_results.length === 0) && (
        <Card>
          <CardContent>
            <Typography
              variant="body1"
              color="textSecondary"
              textAlign="center"
            >
              Engir keppnisárangur skráður.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default AthletesDetails;
