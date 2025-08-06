import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthRoleContext } from "../context/AuthRoleContext";
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  Paper,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Container,
  Alert,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../services/api";
import { useNotification } from "../context/NotificationContext";

function ControlPanel() {
  // Authentication hook - no competitionId for main control panel
  const { authorized, loading: authLoading, userRole } = AuthRoleContext();

  // Component state
  const [competitions, setCompetitions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [year, setYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    competition: null,
  });
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { showSuccess, showError } = useNotification();

  // Combined loading state
  const isLoading = authLoading || dataLoading;

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
      showError("Villa kom upp við að hlaða mótum");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch competitions after authorization is confirmed
    if (authorized && !authLoading) {
      fetchCompetitions();
    }
  }, [authorized, authLoading]);

  const handleCreateCompetition = () => {
    navigate("/controlpanel/create");
  };

  const handleDeleteClick = (competition) => {
    setDeleteDialog({ open: true, competition });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.competition) return;

    setDeleting(true);
    try {
      await api.delete(
        `/competitions/competitions/${deleteDialog.competition.id}/`
      );

      setCompetitions((prev) =>
        prev.filter((comp) => comp.id !== deleteDialog.competition.id)
      );

      setDeleteDialog({ open: false, competition: null });
      showSuccess("Tókst að eyða mótinu!");
    } catch (error) {
      console.error("Error deleting competition:", error);
      showError("Ekki tókst að eyða mótinu");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, competition: null });
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

  // Loading state - show while checking authorization or loading data
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <CircularProgress size={48} />
          <Typography variant="h6" color="text.secondary">
            {authLoading ? "Athuga aðgang..." : "Hleður mótum..."}
          </Typography>
        </Box>
      </Container>
    );
  }

  // If not authorized, return null (AuthRoleContext handles redirect)
  if (!authorized) return null;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with admin badge */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "center" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Stjórnborð
            </Typography>
            <Chip
              label="Stjórnandi"
              color="primary"
              variant="outlined"
              size="medium"
            />
          </Box>
        </Box>
      </Box>

      {/* Main content */}
      <Box
        sx={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {/* Search and filter controls */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 3,
            flexDirection: { xs: "column", sm: "row" },
            flexWrap: "wrap",
          }}
        >
          <TextField
            label="Leita"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth={isMobile}
            sx={{ flex: 1 }}
          />

          <TextField
            label="Ár"
            variant="outlined"
            size="small"
            select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            fullWidth={isMobile}
            sx={{
              minWidth: { xs: "100%", sm: 120 },
              flexShrink: 0,
            }}
          >
            <MenuItem value="">Allt</MenuItem>
            {availableYears.map((yr) => (
              <MenuItem key={yr} value={yr.toString()}>
                {yr}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateCompetition}
            startIcon={<AddIcon />}
            fullWidth={isMobile}
            sx={{ flexShrink: 0 }}
          >
            Nýtt mót
          </Button>
        </Box>

        {/* Competitions list */}
        {filteredCompetitions.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
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
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: { xs: "flex-start", sm: "space-between" },
                  alignItems: { xs: "stretch", sm: "center" },
                  p: { xs: 2, sm: 2 },
                  gap: { xs: 2, sm: 1 },
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    {comp.title}
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/controlpanel/edit/${comp.id}`)}
                        title="Breyta móti"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(comp)}
                        color="error"
                        title="Eyða móti"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {new Date(comp.start_date).toLocaleDateString("is-IS")} –{" "}
                    {new Date(comp.end_date).toLocaleDateString("is-IS")}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="success"
                  onClick={() => navigate(`/controlpanel/${comp.id}`)}
                  fullWidth={isMobile}
                  sx={{
                    minWidth: { xs: "auto", sm: "140px" },
                    py: { xs: 1.5, sm: 1 },
                    flexShrink: 0,
                  }}
                >
                  Skrá Keppendur
                </Button>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Staðfesta eyðingu</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Ertu viss um að þú viljir eyða mótinu{" "}
            {deleteDialog.competition?.title}?
            <br />
            <br />
            Þessi aðgerð er endanleg og mun eyða öllu tengt mótinu, þar á meðal
            flokkum, umferðum og niðurstöðum.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            disabled={deleting}
            color="inherit"
          >
            Hætta við
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={deleting}
            color="error"
            variant="contained"
            autoFocus
          >
            {deleting ? "Eyði..." : "Eyða móti"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ControlPanel;