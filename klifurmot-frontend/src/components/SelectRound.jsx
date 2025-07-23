import { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";

function SelectRound({ competitionId, onContinue }) {
  const [roundGroups, setRoundGroups] = useState([]);
  const [competitionTitle, setCompetitionTitle] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);

    const fetchData = async () => {
      try {
        const [roundRes, compRes] = await Promise.all([
          api.get(`/competitions/rounds/?competition_id=${competitionId}`),
          api.get(`/competitions/competitions/${competitionId}/`),
        ]);

        const uniqueGroups = [];
        const seen = new Set();

        roundRes.data.forEach((round) => {
          const group = round.round_group_detail;
          if (group && !seen.has(group.id)) {
            seen.add(group.id);
            uniqueGroups.push({
              id: group.id,
              name: group.name,
              round_order: round.round_order,
            });
          }
        });

        setRoundGroups(uniqueGroups);
        setCompetitionTitle(compRes.data.title);
      } catch (err) {
        console.error(err);
        setError("Ekki tókst að sækja umferðir eða mótsupplýsingar.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [competitionId]);

  const handleClick = (roundGroupId, roundOrder, roundName) => {
    onContinue(roundGroupId, roundOrder, roundName);
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {competitionTitle}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {roundGroups.map((group) => (
          <Button
            key={group.id}
            variant="outlined"
            size="large"
            onClick={() => handleClick(group.id, group.round_order, group.name)}
            sx={{ py: 2, textTransform: "none" }}
          >
            {group.name}
          </Button>
        ))}
      </Box>
    </Box>
  );
}

export default SelectRound;
