import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Paper,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import api from "../services/api";

const getFlagEmoji = (countryCode) => {
  if (!countryCode) return "🌐";
  return countryCode.replace(/./g, (char) =>
    String.fromCodePoint(char.charCodeAt(0) + 127397)
  );
};

function CompetitionAthletes({ competitionId }) {
  const [competitionTitle, setCompetitionTitle] = useState("");
  const [groupedAthletes, setGroupedAthletes] = useState({});
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        const res = await api.get(
          `/competitions/competitions/${competitionId}/athletes/`
        );
        setCompetitionTitle(res.data.competition || "");
        setGroupedAthletes(res.data.categories || {});
      } catch (err) {
        console.error("Error fetching athletes:", err);
        setError("Ekki tókst að sækja keppendur.");
      }
    };
    fetchAthletes();
  }, [competitionId]);

  const allCategories = Object.keys(groupedAthletes);

  const filterAthletes = (athletes) => {
    return athletes.filter((a) => {
      const matchesSearch = a.full_name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        !categoryFilter || a.category_name === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  };

  if (error) return <Alert severity="error">{error}</Alert>;

  if (!Object.keys(groupedAthletes).length) {
    return (
      <Typography variant="body1">
        Engir keppendur skráðir í þetta mót.
      </Typography>
    );
  }

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
        <TextField
          label="Leita..."
          variant="outlined"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="category-filter-label">Flokkur</InputLabel>
          <Select
            labelId="category-filter-label"
            value={categoryFilter}
            label="Flokkur"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="">Allir flokkar</MenuItem>
            {allCategories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {Object.entries(groupedAthletes).map(([groupName, athletes]) => {
        const filtered = filterAthletes(athletes);
        if (!filtered.length) return null;

        return (
          <Box key={groupName} sx={{ mb: 5 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography variant="h6">{groupName}</Typography>
              <Typography variant="h6">Keppendur: {filtered.length}</Typography>
            </Box>

            <Paper variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nafn</TableCell>
                    <TableCell>Flokkur</TableCell>
                    <TableCell>Kyn</TableCell>
                    <TableCell align="right">Þjóðerni</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.full_name}</TableCell>
                      <TableCell>{a.age_category}</TableCell>
                      <TableCell>{a.gender}</TableCell>
                      <TableCell align="right">
                        {getFlagEmoji(a.nationality)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        );
      })}
    </Box>
  );
}

export default CompetitionAthletes;
