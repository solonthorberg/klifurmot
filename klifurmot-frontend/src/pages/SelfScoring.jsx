import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  IconButton,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { ArrowBack as BackIcon } from "@mui/icons-material";

import api from "../services/api";
import JudgeScoring from "../components/JudgeScoring";

function SelfScoring() {
  const { competitionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selfScoringData, setSelfScoringData] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);
  const [selectedBoulder, setSelectedBoulder] = useState(null);
  const [view, setView] = useState("rounds");
  const [boulderScores, setBoulderScores] = useState({});

  useEffect(() => {
    fetchSelfScoringData();
  }, [competitionId]);

  const fetchSelfScoringData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/competitions/self-scoring/?competition_id=${competitionId}`
      );
      setSelfScoringData(response.data);

      if (response.data.rounds.length === 0) {
        setError(
          "Þú ert ekki skráð(ur) í neinar self-scoring umferðir í þessari keppni."
        );
      }
    } catch (err) {
      console.error("Error fetching self-scoring data:", err);
      setError("Villa kom upp við að sækja gögn. Reyndu aftur.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBoulderScores = async (round) => {
    try {
      const scores = {};

      const scorePromises = round.boulders.map(async (boulder) => {
        try {
          const response = await api.get(`/scoring/climbs/bulk-scores/`, {
            params: {
              round_order: round.round.round_order,
              boulder_number: boulder.boulder_number,
              competition_id: competitionId,
              category_id: round.round.category_id,
            },
          });

          const climberScore = response.data.find(
            (score) => score.climber === selfScoringData.climber.id
          );

          if (climberScore) {
            scores[boulder.id] = {
              top: climberScore.top_reached,
              topAttempts: climberScore.attempts_top || 0,
              zone: climberScore.zone_reached,
              zoneAttempts: climberScore.attempts_zone || 0,
            };
          } else {
            scores[boulder.id] = {
              top: false,
              topAttempts: 0,
              zone: false,
              zoneAttempts: 0,
            };
          }
        } catch (err) {
          scores[boulder.id] = {
            top: false,
            topAttempts: 0,
            zone: false,
            zoneAttempts: 0,
          };
        }
      });

      await Promise.all(scorePromises);
      setBoulderScores(scores);
    } catch (err) {
      console.error("Error fetching boulder scores:", err);
    }
  };

  const handleSelectRound = (round) => {
    setSelectedRound(round);
    setView("boulders");
    fetchBoulderScores(round);
  };

  const handleSelectBoulder = (boulder) => {
    setSelectedBoulder(boulder);
    setView("scoring");
  };

  const handleBackToRounds = () => {
    setSelectedRound(null);
    setView("rounds");
  };

  const handleBackToBoulders = () => {
    setSelectedBoulder(null);
    setView("boulders");
  };

  const handleScoringComplete = () => {
    setSelectedBoulder(null);
    setView("boulders");
    if (selectedRound) {
      fetchBoulderScores(selectedRound);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box mt={4}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => navigate(-1)}>
                Til baka
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      </Container>
    );
  }

  if (view === "scoring" && selectedBoulder && selectedRound) {
    const athlete = {
      climber_id: selfScoringData.climber.id,
      climber: selfScoringData.climber.name,
      start_order: 1,
      category_id: selectedRound.round.competition_category_detail?.id,
      boulder_id: selectedBoulder.id,
    };

    const currentBoulderIndex = selectedRound.boulders.findIndex(
      (boulder) => boulder.id === selectedBoulder.id
    );

    const handleNext = () => {
      const nextIndex = currentBoulderIndex + 1;
      if (nextIndex < selectedRound.boulders.length) {
        setSelectedBoulder(selectedRound.boulders[nextIndex]);
      }
    };

    const handlePrevious = () => {
      const prevIndex = currentBoulderIndex - 1;
      if (prevIndex >= 0) {
        setSelectedBoulder(selectedRound.boulders[prevIndex]);
      }
    };

    return (
      <JudgeScoring
        athlete={athlete}
        boulder={selectedBoulder}
        round={selectedRound.round}
        competition={selfScoringData.competition}
        boulderNumber={selectedBoulder.boulder_number}
        roundOrder={selectedRound.round.round_order}
        competitionId={selfScoringData.competition.id}
        onNext={
          currentBoulderIndex < selectedRound.boulders.length - 1
            ? handleNext
            : null
        }
        onPrevious={currentBoulderIndex > 0 ? handlePrevious : null}
        onBack={handleBackToBoulders}
        onComplete={handleScoringComplete}
        isSelfScoring
      />
    );
  }

  if (view === "boulders" && selectedRound) {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton
            onClick={handleBackToRounds}
            sx={{ mr: 2 }}
            arial-label="Til baka"
          >
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" component="h1">
              {selectedRound.round.round_group}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {selectedRound.round.category} • {selectedRound.boulders.length}{" "}
              leiðir
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Leið</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Stig</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedRound.boulders.map((boulder, index) => (
                <TableRow
                  key={boulder.id}
                  hover
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                  onClick={() => handleSelectBoulder(boulder)}
                >
                  <TableCell>
                    Leið {boulder.boulder_number || index + 1}
                  </TableCell>
                  <TableCell>
                    {boulderScores[boulder.id] ? (
                      <>
                        {boulderScores[boulder.id].top
                          ? `1T(${boulderScores[boulder.id].topAttempts})`
                          : `0T(${boulderScores[boulder.id].topAttempts})`}{" "}
                        {boulderScores[boulder.id].zone
                          ? `1Z(${boulderScores[boulder.id].zoneAttempts})`
                          : `0Z(${boulderScores[boulder.id].zoneAttempts})`}
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {selfScoringData?.competition?.name || "Self-Scoring"}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {selfScoringData?.rounds?.map((roundData) => (
          <Button
            key={roundData.round.id}
            variant="outlined"
            size="large"
            onClick={() => handleSelectRound(roundData)}
            sx={{ py: 2, textTransform: "none" }}
          >
            <Typography variant="h6" component="div">
              {roundData.round.round_group}
            </Typography>
          </Button>
        ))}
      </Box>

      {selfScoringData?.rounds?.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Engar umferðir í boði
        </Alert>
      )}
    </Box>
  );
}

export default SelfScoring;
