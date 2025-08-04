import { useState, useEffect, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Container,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import CompetitionOverview from "../components/CompetitionOverview";
import api from "../services/api";

const CompetitionAthletes = lazy(() =>
  import("../components/CompetitionAthletes")
);
const CompetitionBoulders = lazy(() =>
  import("../components/CompetitionBoulders")
);
const CompetitionStartlist = lazy(() =>
  import("../components/CompetitionStartlist")
);
const CompetitionResults = lazy(() =>
  import("../components/CompetitionResults")
);

function CompetitionDetails() {
  const { id } = useParams();
  const [competition, setCompetition] = useState(null);
  const [activeTab, setActiveTab] = useState("competition");
  const [error, setError] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const fetchCompetition = async () => {
      try {
        const res = await api.get(`/competitions/competitions/${id}/`);
        setCompetition(res.data);
      } catch (err) {
        setError("Ekki tókst að sækja mótið.");
      }
    };

    fetchCompetition();
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderFallback = (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "300px",
      }}
    >
      <CircularProgress />
    </Box>
  );

  const renderTab = () => {
    switch (activeTab) {
      case "competition":
        return <CompetitionOverview competition={competition} />;
      case "athletes":
        return (
          <Suspense fallback={renderFallback}>
            <CompetitionAthletes competitionId={id} />
          </Suspense>
        );
      case "boulders":
        return (
          <Suspense fallback={renderFallback}>
            <CompetitionBoulders competitionId={id} />
          </Suspense>
        );
      case "startlist":
        return (
          <Suspense fallback={renderFallback}>
            <CompetitionStartlist competitionId={id} />
          </Suspense>
        );
      case "results":
        return (
          <Suspense fallback={renderFallback}>
            <CompetitionResults competitionId={id} />
          </Suspense>
        );
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
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress size={60} />
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
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
          aria-label="competition tabs"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: "1rem",
            },
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
