import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
} from "@mui/material";
import api from "../services/api";
import config from "../config/Environment";

function CompetitionResults({ competitionId }) {
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRound, setSelectedRound] = useState("");
  const [loading, setLoading] = useState(true);
  const hasReceivedDataRef = useRef(false);

  useEffect(() => {
    setResults([]);
    setLoading(true);
    setError("");
    hasReceivedDataRef.current = false;

    api
      .get(`/scoring/results/full/${competitionId}/`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setResults(res.data);
          hasReceivedDataRef.current = true;
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Gat ekki sótt niðurstöður.");
        setLoading(false);
      });
  }, [competitionId]);

  useEffect(() => {
    const wsUrl = config.getWebSocketUrl(`results/${competitionId}`);
    const socket = new WebSocket(wsUrl);

    socket.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);
        hasReceivedDataRef.current = true;
        setError("");
        if (Array.isArray(data)) {
          setResults(data);
        }
      } catch {
        setError("Villa við að hlaða niðurstöðum.");
      }
    };

    socket.onerror = () => {
      if (!hasReceivedDataRef.current) {
        setError("Tenging við niðurstöðukerfi mistókst.");
      }
    };

    return () => {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    };
  }, [competitionId]);

  if (error && !results.length) return <Alert severity="error">{error}</Alert>;
  if (loading) return <Typography>Sæki niðurstöður...</Typography>;
  if (!results.length)
    return <Typography>Engar niðurstöður skráðar.</Typography>;

  const allCategories = results.map((r) => r.category);
  const allRounds = [
    ...new Set(results.flatMap((r) => r.rounds.map((ro) => ro.round_name))),
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Niðurstöður
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="category-label">Flokkur</InputLabel>
          <Select
            labelId="category-label"
            value={selectedCategory}
            label="Flokkur"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="">Allir flokkar</MenuItem>
            {allCategories.map((cat, i) => (
              <MenuItem key={i} value={cat.id}>
                {`${cat.group?.name || "?"} - ${cat.gender}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="round-label">Umferð</InputLabel>
          <Select
            labelId="round-label"
            value={selectedRound}
            label="Umferð"
            onChange={(e) => setSelectedRound(e.target.value)}
          >
            <MenuItem value="">Allar umferðir</MenuItem>
            {allRounds.map((r, i) => (
              <MenuItem key={i} value={r}>
                {r}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {results
        .filter(
          (cat) =>
            !selectedCategory || cat.category.id === parseInt(selectedCategory)
        )
        .map((cat, idx) => (
          <Box key={idx} sx={{ mb: 5 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {`${cat.category.group?.name || "?"} - ${cat.category.gender}`}
            </Typography>
            {cat.rounds
              .filter((r) => !selectedRound || r.round_name === selectedRound)
              .map((round, j) => (
                <Box key={j} sx={{ mb: 3, ml: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    {round.round_name}
                  </Typography>
                  <Paper variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell align="center" sx={{ width: "50px" }}>
                            Nr.
                          </TableCell>
                          <TableCell>Nafn</TableCell>
                          <TableCell align="center">Top</TableCell>
                          <TableCell align="center">Zone</TableCell>
                          <TableCell align="center">Stig</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {round.results.map((athlete, i) => (
                          <TableRow key={i}>
                            <TableCell align="center">{athlete.rank}</TableCell>
                            <TableCell>{athlete.full_name}</TableCell>
                            <TableCell align="center">
                              {athlete.tops}T ({athlete.attempts_top})
                            </TableCell>
                            <TableCell align="center">
                              {athlete.zones}Z ({athlete.attempts_zone})
                            </TableCell>
                            <TableCell align="center">
                              {athlete.total_score !== undefined
                                ? athlete.total_score.toFixed(1)
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </Box>
              ))}
          </Box>
        ))}
    </Box>
  );
}

export default CompetitionResults;
