import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
} from "@mui/material";
import api from "../services/api";

function CompetitionStartlist({ competitionId }) {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRound, setSelectedRound] = useState("");

  useEffect(() => {
    const fetchStartlists = async () => {
      try {
        const res = await api.get(
          `/competitions/competitions/${competitionId}/startlist/`
        );
        setCategories(res.data);
      } catch (err) {
        console.error("Error fetching start list:", err);
        setError("Ekki tókst að sækja ráslista.");
      }
    };

    fetchStartlists();
  }, [competitionId]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!categories.length)
    return <Typography>Engir keppendur í ráslista.</Typography>;

  const allCategories = [...new Set(categories.map((c) => c.category))];
  const allRounds = [
    ...new Set(categories.flatMap((c) => c.rounds.map((r) => r.round_name))),
  ];

  return (
    <Box>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          alignItems: "flex-start",
        }}
      >
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
              <MenuItem key={i} value={cat}>
                {cat}
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

      {categories
        .filter((cat) => !selectedCategory || cat.category === selectedCategory)
        .map((cat, idx) => (
          <Box key={idx} sx={{ mb: 5 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {cat.category}
            </Typography>
            {cat.rounds
              .filter(
                (round) => !selectedRound || round.round_name === selectedRound
              )
              .map((round, j) => (
                <Box key={j} sx={{ mb: 3, ml: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    {round.round_name}
                  </Typography>
                  <Paper variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell
                            align="center"
                            sx={{ width: "50px", paddingLeft: 2 }}
                          >
                            Nr.
                          </TableCell>
                          <TableCell sx={{ paddingLeft: 1 }}>Nafn</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {round.athletes.map((athlete, i) => (
                          <TableRow key={i}>
                            <TableCell
                              align="center"
                              sx={{ width: "50px", paddingLeft: 2 }}
                            >
                              {athlete.start_order}
                            </TableCell>
                            <TableCell sx={{ paddingLeft: 1 }}>
                              {athlete.full_name}
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

export default CompetitionStartlist;
