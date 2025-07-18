import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Alert,
} from "@mui/material";
import api from "../services/api";

function CompetitionBoulders({ competitionId }) {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRound, setSelectedRound] = useState("");

  useEffect(() => {
    const fetchBoulders = async () => {
      try {
        const res = await api.get(
          `/competitions/competitions/${competitionId}/boulders/`
        );
        setCategories(res.data);
      } catch (err) {
        console.error("Error loading boulders:", err);
        setError("Ekki tókst að sækja leiðirnar.");
      }
    };

    fetchBoulders();
  }, [competitionId]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!categories.length)
    return <Typography>Engar leiðir skráðar fyrir þetta mót.</Typography>;

  const allCategories = [...new Set(categories.map((c) => c.category))];
  const allRounds = [
    ...new Set(categories.flatMap((c) => c.rounds.map((r) => r.round_name))),
  ];

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 4,
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
        .map((cat, i) => (
          <Box key={i} sx={{ mb: 5 }}>
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
                  <Grid container spacing={2}>
                    {round.boulders.map((boulder, idx) => (
                      <Grid item xs={6} sm={4} md={3} lg={2} key={idx}>
                        <Card variant="outlined" sx={{ textAlign: "center" }}>
                          <CardContent>
                            <Typography variant="subtitle2" gutterBottom>
                              Boulder {boulder.number}
                            </Typography>
                            <Typography>{boulder.tops}T</Typography>
                            <Typography>{boulder.zones}Z</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))}
          </Box>
        ))}
    </Box>
  );
}

export default CompetitionBoulders;
