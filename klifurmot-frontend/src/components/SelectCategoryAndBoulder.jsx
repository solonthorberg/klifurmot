import { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { ArrowBack as BackIcon } from "@mui/icons-material";

function SelectCategoryAndBoulder({
  roundGroupId,
  roundOrder,
  roundName,
  competitionId,
  onSelectAthlete,
  onBack,
}) {
  const [categories, setCategories] = useState([]);
  const [boulders, setBoulders] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedBoulderId, setSelectedBoulderId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);

    api
      .get(
        `/competitions/competition-categories/?competition_id=${competitionId}`
      )
      .then((res) => {
        const competitionCategories = res.data.filter(
          (cat) => cat.competition === parseInt(competitionId)
        );
        setCategories(competitionCategories);
      })
      .catch((err) => console.error("Failed to fetch categories", err));
  }, [competitionId]);

  useEffect(() => {
    if (!selectedCategoryId) return;

    api
      .get(
        `/competitions/boulders/?competition_id=${competitionId}&category_id=${selectedCategoryId}&round_group_id=${roundGroupId}`
      )
      .then((res) => setBoulders(res.data))
      .catch((err) => console.error("Failed to fetch boulders", err));
  }, [selectedCategoryId, competitionId, roundGroupId]);

  useEffect(() => {
    if (!selectedBoulderId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const startlistRes = await api.get(
          `/scoring/startlist/?competition_id=${competitionId}&category_id=${selectedCategoryId}&round_group_id=${roundGroupId}`
        );
        const selectedBoulder = boulders.find(
          (b) => b.id === parseInt(selectedBoulderId)
        );

        const baseAthletes = startlistRes.data.map((a) => ({
          ...a,
          round_id: roundGroupId,
          round_order: roundOrder,
          boulder_id: selectedBoulderId,
          boulder_number: selectedBoulder?.boulder_number,
          competition_id: competitionId,
          category_id: selectedCategoryId,
          score: { top: false, topAttempts: 0, zone: false, zoneAttempts: 0 },
        }));

        const climbRes = await api.get(`/scoring/climbs/bulk-scores/`, {
          params: {
            round_order: roundOrder,
            boulder_number: selectedBoulder?.boulder_number,
            competition_id: competitionId,
            category_id: selectedCategoryId,
          },
        });

        const enriched = baseAthletes.map((athlete) => {
          const boulder_climb = climbRes.data.find(
            (c) => c.climber === athlete.climber_id
          );
          return {
            ...athlete,
            score: boulder_climb
              ? {
                  top: boulder_climb.top_reached,
                  topAttempts: boulder_climb.attempts_top || 0,
                  zone: boulder_climb.zone_reached,
                  zoneAttempts: boulder_climb.attempts_zone || 0,
                }
              : athlete.score,
          };
        });

        setAthletes(enriched);
      } catch (err) {
        if (err.response?.status === 404) {
          setAthletes(null);
        } else {
          console.error("Failed to fetch athletes or scores", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    selectedBoulderId,
    selectedCategoryId,
    competitionId,
    roundGroupId,
    roundOrder,
    boulders,
  ]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton onClick={onBack} sx={{ mr: 2 }} aria-label="Til baka">
          <BackIcon />
        </IconButton>
        <Typography variant="h5">{roundName}</Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Flokkur</InputLabel>
          <Select
            value={selectedCategoryId}
            label="Flokkur"
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.category_group_detail.name} - {cat.gender}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Leið</InputLabel>
          <Select
            value={selectedBoulderId}
            label="Leið"
            onChange={(e) => setSelectedBoulderId(e.target.value)}
            disabled={!selectedCategoryId}
          >
            {boulders.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                Leið {b.boulder_number}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Hleður keppendur...</Typography>
        </Box>
      )}

      {athletes === null && !loading && (
        <Alert severity="info">Listi í vinnslu</Alert>
      )}

      {athletes && athletes.length === 0 && !loading && selectedBoulderId && (
        <Alert severity="warning">
          Engir keppendur skráðir í þessa umferð.
        </Alert>
      )}

      {athletes.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Nr.</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Nafn</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  Leið{" "}
                  {
                    boulders.find((b) => b.id === parseInt(selectedBoulderId))
                      ?.boulder_number
                  }
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {athletes.map((athlete) => (
                <TableRow
                  key={athlete.climber_id}
                  hover
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                  onClick={() =>
                    onSelectAthlete(athlete, athlete.boulder_number, athletes)
                  }
                >
                  <TableCell>{athlete.start_order}</TableCell>
                  <TableCell>{athlete.climber}</TableCell>
                  <TableCell>
                    {athlete.score.top
                      ? `1T(${athlete.score.topAttempts})`
                      : `0T(${athlete.score.topAttempts})`}{" "}
                    {athlete.score.zone
                      ? `1Z(${athlete.score.zoneAttempts})`
                      : `0Z(${athlete.score.zoneAttempts})`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default SelectCategoryAndBoulder;
