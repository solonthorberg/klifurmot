import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Container,
  CircularProgress,
  Alert
} from "@mui/material";

import CompetitionOverview from "../components/CompetitionOverview";
import CompetitionAthletes from "../components/CompetitionAthletes";
import CompetitionBoulders from "../components/CompetitionBoulders";
import CompetitionStartlist from "../components/CompetitionStartlist";
import CompetitionResults from "../components/CompetitionResults";
import api from "../services/api";

function CompetitionDetails() {
  const { id } = useParams();
  const [competition, setCompetition] = useState(null);
  const [activeTab, setActiveTab] = useState("competition");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCompetition = async () => {
      try {
        const res = await api.get(`/competitions/competitions/${id}/`);
        setCompetition(res.data);
      } catch (err) {
        console.error("Error fetching competition:", err);
        setError("Ekki tókst að sækja mótið.");
      }
    };

    fetchCompetition();
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderTab = () => {
    switch (activeTab) {
      case "competition":
        return <CompetitionOverview competition={competition} />;
      case "athletes":
        return <CompetitionAthletes competitionId={id} />;
      case "boulders":
        return <CompetitionBoulders competitionId={id} />;
      case "startlist":
        return <CompetitionStartlist competitionId={id} />;
      case "results":
        return <CompetitionResults competitionId={id} />;
      default:
        return null;
    }
  };

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!competition) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Sæki gögn...
        </Typography>
      </Container>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {competition.title}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="competition tabs"
            textColor="primary"
            indicatorColor="primary"
            sx={{
                '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1rem'
                }
            }}
            >
            <Tab label="Mót" value="competition" />
            <Tab label="Keppendur" value="athletes" />
            <Tab label="Leiðir" value="boulders" />
            <Tab label="Ráslisti" value="startlist" />
            <Tab label="Niðurstöður" value="results" />
            </Tabs>

      </Box>

      <Box>{renderTab()}</Box>
    </Box>
  );
}

export default CompetitionDetails;
