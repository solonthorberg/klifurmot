import { useEffect, useState } from "react";
import api from "../services/api";
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Container,
  Select,
  InputAdornment,
  FormControl,
  InputLabel,
  MenuItem,
  Card,
  CardContent,
  CardMedia,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

function Competitions() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCompetitions = async () => {
    try {
      const response = await api.get("competitions/competitions/");

      const visibleCompetitions = response.data.filter(
        (comp) => comp.visible === true
      );
      setCompetitions(visibleCompetitions);

      const years = [
        ...new Set(
          visibleCompetitions.map((comp) =>
            new Date(comp.start_date).getFullYear()
          )
        ),
      ];
      setAvailableYears(years.sort((a, b) => b - a));
    } catch (error) {
      console.error("Error fetching competitions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const filteredCompetitions = competitions
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
    .filter((comp) => {
      const matchesYear = year
        ? new Date(comp.start_date).getFullYear() === parseInt(year)
        : true;
      const matchesSearch = comp.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesYear && matchesSearch;
    });

  const formatDateRange = (start, end) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    const startDate = new Date(start).toLocaleDateString("en-US", options);
    const endDate = new Date(end).toLocaleDateString("en-US", options);
    return `${startDate} – ${endDate}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Hleður inn mótum...
        </Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom textAlign="center">
        Mót
      </Typography>

      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 3,
        }}
      >
        <TextField
          variant="outlined"
          placeholder="Leita..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400, width: "100%" }}
        />

        <FormControl sx={{ ml: 2, minWidth: 120 }}>
          <InputLabel id="year-select-label">Ár</InputLabel>
          <Select
            labelId="year-select-label"
            value={year}
            label="Year"
            onChange={(e) => setYear(e.target.value)}
          >
            <MenuItem value="">Öll ár</MenuItem>
            {availableYears.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {filteredCompetitions.length === 0 ? (
        <Typography
          variant="body1"
          color="textSecondary"
          sx={{ mt: 3, textAlign: "center" }}
        >
          {searchQuery ? "Engin mót fundust." : "Engir mót fundust."}
        </Typography>
      ) : (
        <Box>
          {filteredCompetitions.map((comp) => (
            <Card
              key={comp.id}
              component="a"
              href={`/competitions/${comp.id}`}
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
                textDecoration: "none",
                color: "inherit",
                borderRadius: 1,
                border: "1px solid #e0e0e0",
              }}
            >
              <CardMedia
                component="img"
                sx={{ width: 120, height: 100, objectFit: "cover" }}
                image={
                  comp.image ||
                  "https://via.placeholder.com/120x100?text=No+Image"
                }
                alt={comp.title}
              />
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6">{comp.title}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatDateRange(comp.start_date, comp.end_date)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default Competitions;
