import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import api from "../services/api";

function ControlPanel() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const fetchCompetitions = async () => {
    try {
      const response = await api.get("competitions/competitions/");
      setCompetitions(response.data);
      const years = [
        ...new Set(
          response.data.map((comp) => new Date(comp.start_date).getFullYear())
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

  // Handle creating new competition
  const handleCreateCompetition = () => {
    navigate("/controlpanel/create");
  };

  const filteredCompetitions = competitions.filter((comp) => {
    const matchesQuery = comp.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesYear =
      year === "" ||
      new Date(comp.start_date).getFullYear().toString() === year;
    return matchesQuery && matchesYear;
  });

  return (
    <Box sx={{ maxWidth: "800px", margin: "0 auto" }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Stjórnborð
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateCompetition}
          startIcon={<AddIcon />}
        >
          Búa til mót
        </Button>
        <TextField
          label="Leita"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <TextField
          label="Ár"
          variant="outlined"
          size="small"
          select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          sx={{ minWidth: 100 }}
        >
          <MenuItem value="">Allt</MenuItem>
          {availableYears.map((yr) => (
            <MenuItem key={yr} value={yr.toString()}>
              {yr}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {loading ? (
        <Typography>Hleð mótum...</Typography>
      ) : filteredCompetitions.length === 0 ? (
        <Typography color="text.secondary">
          Engin mót fundust með þessum leitarskilyrðum.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredCompetitions.map((comp) => (
            <Paper
              key={comp.id}
              variant="outlined"
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                px: 2,
                py: 1.5,
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  {comp.title}
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/controlpanel/edit/${comp.id}`)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(comp.start_date).toLocaleDateString("is-IS")} –{" "}
                  {new Date(comp.end_date).toLocaleDateString("is-IS")}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate(`/controlpanel/${comp.id}`)}
              >
                Skrá keppendur
              </Button>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default ControlPanel;
