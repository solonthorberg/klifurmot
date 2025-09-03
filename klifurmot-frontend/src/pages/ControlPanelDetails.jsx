import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthRoleContext } from "../context/AuthRoleContext";
import api from "../services/api";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemButton,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Divider,
  Container,
} from "@mui/material";
import {
  DragIndicator as DragIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import JudgeLinkSection from "../components/JudgeLink";
import QuickAddAthlete from "../components/QuickAddAthlete";
import { useNotification } from "../context/NotificationContext";

function SortableAthleteRow({ athlete, index, onRemove, isReordering }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: athlete.climber_id || athlete.id || `athlete-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isReordering ? 0.7 : 1,
  };

  const renderCategory = () => {
    return athlete.age_category || athlete.category || "–";
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      sx={{
        backgroundColor: isReordering ? "grey.50" : "transparent",
        "&:hover": { backgroundColor: "grey.50" },
      }}
    >
      <TableCell sx={{ width: 30, textAlign: "center", p: 0.5 }}>
        <IconButton
          size="small"
          {...attributes}
          {...listeners}
          sx={{ cursor: isDragging ? "grabbing" : "grab", color: "grey.500" }}
        >
          <DragIcon fontSize="small" />
        </IconButton>
      </TableCell>
      <TableCell sx={{ width: 50, textAlign: "center", fontWeight: 500, p: 1 }}>
        {athlete.start_order}
      </TableCell>
      <TableCell sx={{ p: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {athlete.full_name}
        </Typography>
        {isReordering && (
          <Typography variant="caption" color="warning.main">
            Uppfærir...
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ p: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {renderCategory()}
        </Typography>
      </TableCell>
      <TableCell sx={{ width: 50, textAlign: "center", p: 0.5 }}>
        <IconButton
          size="small"
          color="error"
          onClick={() => onRemove(athlete)}
          disabled={isReordering}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

function ControlPanelDetails() {
  const navigate = useNavigate();
  const { competitionId } = useParams();

  // Authentication hook for competition-specific access
  const {
    authorized,
    loading: authLoading,
    userRole,
  } = AuthRoleContext(competitionId);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { showSuccess, showError } = useNotification();

  // Component state
  const [startlist, setStartlist] = useState([]);
  const [activeRound, setActiveRound] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [availableAthletes, setAvailableAthletes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [competitionTitle, setCompetitionTitle] = useState("");
  const [advancing, setAdvancing] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [results, setResults] = useState([]);

  const sensors = useSensors(useSensor(PointerSensor));

  // Combined loading state
  const isLoading = authLoading || dataLoading;

  // Fetch all data when authorized
  useEffect(() => {
    if (authorized && !authLoading) {
      fetchAllData();
    }
  }, [authorized, authLoading, competitionId]);

  const fetchAllData = async () => {
    try {
      setDataLoading(true);
      await Promise.all([
        fetchCompetitionDetails(),
        fetchStartlist(),
        fetchAvailableAthletes(),
        fetchRounds(),
        fetchResults(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      showError("Villa kom upp við að hlaða gögnum");
    } finally {
      setDataLoading(false);
    }
  };

  const fetchCompetitionDetails = async () => {
    try {
      const res = await api.get(`/competitions/competitions/${competitionId}/`);
      setCompetitionTitle(res.data.title);
    } catch (err) {
      console.error("Failed to load competition details:", err);
    }
  };

  const fetchStartlist = async () => {
    try {
      const res = await api.get(
        `/competitions/competitions/${competitionId}/startlist/`
      );
      console.log("Startlist data received:", res.data);

      const processedData = res.data.map((category) => ({
        ...category,
        rounds: category.rounds.map((round) => ({
          ...round,
          athletes: round.athletes.map((athlete) => ({
            ...athlete,
            climber_id: athlete.climber_id || athlete.id,
            id: athlete.id || athlete.climber_id,
          })),
        })),
      }));

      console.log("Processed startlist data:", processedData);
      setStartlist(processedData);

      const allRounds = res.data.flatMap((cat) =>
        cat.rounds.map((r) => r.round_name)
      );
      const uniqueRounds = [...new Set(allRounds)];
      if (uniqueRounds.length > 0 && !activeRound) {
        setActiveRound(uniqueRounds[0]);
      }
    } catch (err) {
      console.error("Failed to load startlist:", err);
    }
  };

  const fetchAvailableAthletes = async () => {
    try {
      const res = await api.get("/athletes/climbers/");
      console.log("Available athletes with categories:", res.data);
      setAvailableAthletes(res.data);
    } catch (err) {
      console.error("Failed to load athletes:", err);
    }
  };

  const fetchResults = async () => {
    try {
      const res = await api.get(`/scoring/results/full/${competitionId}/`);
      console.log("Results data:", res.data);
      setResults(res.data);
    } catch (err) {
      console.error("Failed to load results:", err);
    }
  };

  const fetchRounds = async () => {
    try {
      const res = await api.get(
        `/competitions/rounds/?competition_id=${competitionId}`
      );
      console.log("Rounds data:", res.data);
      setRounds(res.data);
    } catch (err) {
      console.error("Failed to load rounds:", err);
    }
  };

  const handleGoToJudgeDashboard = () => {
    navigate(`/admin/competition/${competitionId}/judge-dashboard`);
  };

  const handleDragEnd = async (event, categoryName) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const categoryData = getCategoriesForRound().find(
      (cat) => cat.category === categoryName
    );

    if (!categoryData) {
      console.error("Category not found:", categoryName);
      return;
    }

    const athletes = [...categoryData.athletes];

    let oldIndex = -1;
    let newIndex = -1;

    oldIndex = athletes.findIndex(
      (athlete) => athlete.id?.toString() === active.id?.toString()
    );
    newIndex = athletes.findIndex(
      (athlete) => athlete.id?.toString() === over.id?.toString()
    );

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    if (oldIndex === -1 || newIndex === -1) {
      console.error("Could not find athlete indices", {
        oldIndex,
        newIndex,
        activeId: active.id,
        overId: over.id,
        athleteIds: athletes.map((a) => ({
          climber_id: a.climber_id,
          id: a.id,
          start_order: a.start_order,
        })),
      });
      return;
    }

    const reorderedAthletes = arrayMove(athletes, oldIndex, newIndex);
    const updatedAthletes = reorderedAthletes.map((athlete, index) => ({
      ...athlete,
      start_order: index + 1,
    }));

    setStartlist((prevStartlist) =>
      prevStartlist.map((cat) => {
        if (cat.category === categoryName) {
          return {
            ...cat,
            isReordering: true,
            rounds: cat.rounds.map((round) => {
              if (round.round_name === activeRound) {
                return {
                  ...round,
                  athletes: updatedAthletes,
                };
              }
              return round;
            }),
          };
        }
        return cat;
      })
    );

    try {
      const athletesPayload = updatedAthletes.map((athlete, index) => {
        const climberId = athlete.climber_id || athlete.id;
        console.log(`Athlete ${index + 1}:`, {
          name: athlete.full_name,
          climber_id: climberId,
          start_order: index + 1,
        });

        if (!climberId) {
          console.error("Missing climber_id for athlete:", athlete);
        }

        return {
          climber_id: climberId,
          start_order: index + 1,
        };
      });

      const payload = {
        competition: parseInt(competitionId),
        category: categoryName,
        round: activeRound,
        athletes: athletesPayload,
      };

      console.log("Sending payload to backend:", payload);

      const response = await api.post(
        "/competitions/update-start-order/",
        payload
      );

      console.log("Start order updated successfully:", response.data);
    } catch (err) {
      console.error("Failed to update start order:", err.response?.data || err);
      console.error("Full error object:", err);

      await fetchStartlist();

      let errorMsg = "Ekki tókst að uppfæra röðun";
      if (err.response?.data?.detail) {
        errorMsg += `: ${err.response.data.detail}`;
      } else if (err.response?.data?.errors) {
        errorMsg += `: ${err.response.data.errors.join(", ")}`;
      }

      showError("Ekki tókst að uppfæra röðun");
    } finally {
      setStartlist((prevStartlist) =>
        prevStartlist.map((cat) => {
          if (cat.category === categoryName) {
            return {
              ...cat,
              isReordering: false,
            };
          }
          return cat;
        })
      );
    }
  };

  const handleAdvanceClimbers = async (categoryName, currentRoundName) => {
    console.log(
      "Advancing climbers from:",
      currentRoundName,
      "in category:",
      categoryName
    );

    const categoryRounds = rounds
      .filter((round) => {
        if (
          !round?.competition_category_detail?.category_group_detail?.name ||
          !round?.competition_category_detail?.gender
        ) {
          return false;
        }
        const roundCategoryName = `${round.competition_category_detail.category_group_detail.name} ${round.competition_category_detail.gender}`;
        return roundCategoryName === categoryName;
      })
      .sort((a, b) => a.round_order - b.round_order);

    console.log("Category rounds found:", categoryRounds);

    const currentRoundIndex = categoryRounds.findIndex(
      (r) => r.round_group_detail?.name === currentRoundName
    );

    if (currentRoundIndex === -1) {
      showError("Gat ekki fundið núverandi umferð.");
      return;
    }

    const currentRound = categoryRounds[currentRoundIndex];
    const nextRound = categoryRounds[currentRoundIndex + 1];

    if (!nextRound) {
      showError("Engin næsta umferð til að flytja í");
      return;
    }

    console.log("Advancing FROM round:", currentRound.id, currentRoundName);
    console.log(
      "Advancing TO round:",
      nextRound.id,
      nextRound.round_group_detail.name
    );

    try {
      setAdvancing(`${categoryName}-${currentRoundName}`);

      const response = await api.post(`/scoring/advance/${currentRound.id}/`);

      if (response.data.status === "ok") {
        const message = `Tókst að flytja ${response.data.advanced} keppendur úr ${currentRoundName} í ${nextRound.round_group_detail.name}!`;
        console.log("SUCCESS:", message);
        showSuccess(message);

        await fetchStartlist();
        await fetchResults();

        console.log("Data refreshed after advancing climbers");
      } else {
        const errorMsg = `Villa: ${response.data.message || "Óþekkt villa"}`;
        console.error("Advance failed:", response.data);
        showError("Villa, tókst ekki að flytja keppendur");
      }
    } catch (err) {
      console.error("ERROR during advance:", err);
      const errorMessage =
        err.response?.data?.detail || "Ekki tókst að flytja keppendur.";
      console.log(errorMessage);
      showError("Ekki tókst að flytja keppendur");
    } finally {
      setAdvancing(null);
    }
  };

  const handleRemoveAthlete = async (athlete, category) => {
    console.log("Removing athlete", athlete.full_name, "from", category);

    try {
      const payload = {
        competition: competitionId,
        category: category,
        round: activeRound,
        start_order: athlete.start_order,
      };

      console.log("Remove payload:", payload);

      await api.post("/competitions/remove-athlete/", payload);

      console.log(`${athlete.full_name} removed from ${category}`);
      await fetchStartlist();
    } catch (err) {
      console.error("Failed to remove athlete:", err.response?.data || err);
      showError("Ekki tókst að fjarlægja keppanda");
    }
  };

  const handleAddAthlete = (category) => {
    console.log("Adding athlete to category:", category);
    setSelectedCategory(category);
    setShowAddModal(true);
    setSearchQuery("");
  };

  const handleSelectAthlete = async (athlete) => {
    if (!selectedCategory || !activeRound) return;

    console.log(
      "Selecting athlete:",
      athlete.user_account?.full_name,
      "for category:",
      selectedCategory
    );

    try {
      const payload = {
        competition: competitionId,
        category: selectedCategory,
        round: activeRound,
        climber: athlete.id,
        is_simple: athlete.is_simple_athlete || false,
      };

      console.log("Register athlete payload:", payload);

      const response = await api.post(
        "/competitions/register-athlete/",
        payload
      );

      console.log("Athlete registered:", response.data);
      await fetchStartlist();
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to register athlete:", err.response?.data || err);
      showError("Ekki tókst að skrá keppanda");
    }
  };

  const roundNames = [
    ...new Set(startlist.flatMap((cat) => cat.rounds.map((r) => r.round_name))),
  ];

  const getCategoriesForRound = () =>
    startlist
      .map((cat) => {
        const round = cat.rounds.find((r) => r.round_name === activeRound);
        return round
          ? {
              category: cat.category,
              athletes: round.athletes || [],
              roundData: round,
              isReordering: cat.isReordering || false,
              maxAthletes: getMaxAthletesForRound(cat.category, activeRound),
            }
          : null;
      })
      .filter(Boolean);

  const getMaxAthletesForRound = (categoryName, roundName) => {
    const categoryRounds = rounds.filter((round) => {
      if (
        !round?.competition_category_detail?.category_group_detail?.name ||
        !round?.competition_category_detail?.gender
      ) {
        return false;
      }
      const roundCategoryName = `${round.competition_category_detail.category_group_detail.name} ${round.competition_category_detail.gender}`;
      return roundCategoryName === categoryName;
    });

    const matchingRound = categoryRounds.find(
      (r) => r.round_group_detail?.name === roundName
    );

    return (
      matchingRound?.climbers_advance || matchingRound?.max_athletes || null
    );
  };

  const getFilteredAthletes = () => {
    if (!selectedCategory) return [];
    const gender = selectedCategory.includes("KVK") ? "KVK" : "KK";

    return availableAthletes.filter((athlete) => {
      const name = athlete.user_account?.full_name || athlete.simple_name || "";
      const athleteGender =
        athlete.user_account?.gender || athlete.simple_gender;

      const nameMatch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const genderMatch = athleteGender === gender;

      return nameMatch && genderMatch;
    });
  };

  const hasResultsForRound = (categoryName, roundName) => {
    const categoryResults = results.find((r) => {
      if (!r.category || !r.category.group) {
        return false;
      }

      const resultCategoryName = `${r.category.group.name} ${r.category.gender}`;
      return resultCategoryName === categoryName;
    });

    if (!categoryResults || !categoryResults.rounds) {
      return false;
    }

    const roundResults = categoryResults.rounds.find((r) => {
      return r.round_name === roundName;
    });

    if (!roundResults || !roundResults.results) {
      return false;
    }

    return roundResults.results.length > 0;
  };

  const getNextRoundForCategory = (categoryName, currentRoundName) => {
    const categoryRounds = rounds
      .filter((round) => {
        if (
          !round?.competition_category_detail?.category_group_detail?.name ||
          !round?.competition_category_detail?.gender
        ) {
          return false;
        }

        const roundCategoryName = `${round.competition_category_detail.category_group_detail.name} ${round.competition_category_detail.gender}`;
        return roundCategoryName === categoryName;
      })
      .sort((a, b) => a.round_order - b.round_order);

    const currentRoundIndex = categoryRounds.findIndex(
      (r) => r.round_group_detail?.name === currentRoundName
    );

    return categoryRounds[currentRoundIndex + 1] || null;
  };

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
            {authLoading ? "Athuga aðgang..." : "Hleður keppnisstjórn..."}
          </Typography>
        </Box>
      </Container>
    );
  }

  // If not authorized, return null (AuthRoleContext handles redirect)
  if (!authorized) return null;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header with role badge */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {competitionTitle && (
              <Typography variant="h4" component="h1">
                {competitionTitle}
              </Typography>
            )}
            <Chip
              label={userRole === "admin" ? "Keppnisstjóri" : "Dómari"}
              color={userRole === "admin" ? "primary" : "success"}
              variant="outlined"
              size="medium"
            />
          </Box>
          <Button
            variant="contained"
            color="success"
            onClick={handleGoToJudgeDashboard}
            sx={{
              alignSelf: { xs: "stretch", sm: "auto" },
              textTransform: "none",
            }}
          >
            Dómaraviðmót
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeRound || false}
          onChange={(e, newValue) => setActiveRound(newValue)}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
        >
          {roundNames.map((name) => (
            <Tab key={name} label={name} value={name} />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {getCategoriesForRound().map((cat, idx) => {
          const nextRound = getNextRoundForCategory(cat.category, activeRound);
          const isAdvancing = advancing === `${cat.category}-${activeRound}`;
          const hasCurrentResults = hasResultsForRound(
            cat.category,
            activeRound
          );
          const showAdvanceButton = nextRound && hasCurrentResults;

          return (
            <Card key={idx} sx={{ width: "100%" }}>
              <Box sx={{ p: 2, pb: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    mb: 1,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    {cat.category}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Keppendur: {cat.athletes.length}/{cat.maxAthletes || "∞"}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddAthlete(cat.category)}
                    disabled={cat.isReordering}
                  >
                    Keppandi
                  </Button>

                  {showAdvanceButton && (
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      onClick={() =>
                        handleAdvanceClimbers(cat.category, activeRound)
                      }
                      disabled={isAdvancing || cat.isReordering}
                    >
                      {isAdvancing
                        ? "Flyti..."
                        : "Flytja í " + nextRound.round_group_detail.name}
                    </Button>
                  )}

                  {nextRound && !hasCurrentResults && (
                    <Button variant="outlined" size="small" disabled>
                      Flytja í {nextRound.round_group_detail.name}
                    </Button>
                  )}
                </Box>
              </Box>

              <Divider />

              <CardContent sx={{ p: 0 }}>
                {cat.athletes.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      Engir keppendur skráðir
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, cat.category)}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 40 }}></TableCell>
                            <TableCell
                              sx={{ textAlign: "center", fontWeight: "bold" }}
                            >
                              Nr.
                            </TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>
                              Nafn
                            </TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>
                              Flokkur
                            </TableCell>
                            <TableCell sx={{ width: 60 }}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <SortableContext
                            items={cat.athletes.map(
                              (athlete, i) =>
                                athlete.climber_id ||
                                athlete.id ||
                                `athlete-${i}`
                            )}
                            strategy={verticalListSortingStrategy}
                          >
                            {cat.athletes.map((athlete, i) => (
                              <SortableAthleteRow
                                key={
                                  athlete.climber_id ||
                                  athlete.id ||
                                  `athlete-${i}`
                                }
                                athlete={athlete}
                                index={i}
                                isReordering={cat.isReordering}
                                onRemove={(athlete) =>
                                  handleRemoveAthlete(athlete, cat.category)
                                }
                              />
                            ))}
                          </SortableContext>
                        </TableBody>
                      </Table>
                    </DndContext>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Bæta við keppanda - {selectedCategory}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="Leita að keppanda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
          />
          <Paper variant="outlined" sx={{ maxHeight: 400, overflow: "auto" }}>
            {getFilteredAthletes().length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  Engir keppendur fundust
                </Typography>
              </Box>
            ) : (
              <List>
                {getFilteredAthletes().map((athlete) => (
                  <ListItem key={athlete.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleSelectAthlete(athlete)}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {athlete.user_account?.full_name ||
                            athlete.simple_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {athlete.age_category || "–"} •
                          {athlete.user_account?.date_of_birth ||
                            `${athlete.simple_age} ára`}{" "}
                          •
                          {athlete.user_account?.gender ||
                            athlete.simple_gender}
                        </Typography>
                      </Box>
                      <Chip label="Velja" color="primary" size="small" />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddModal(false)}>Hætta við</Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mt: 4 }}>
        <JudgeLinkSection competitionId={competitionId} />
      </Box>

      <Box sx={{ mt: 4 }}>
        <QuickAddAthlete />
      </Box>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Athugið:</strong> Til að nota "Flytja" takkann þarf að vera
          búinn að skrá niðurstöður fyrir núverandi umferð. Kerfið flytur
          sjálfkrafa bestu keppendur út frá stigagjöf í næstu umferð.
          <br />
          <strong>Röðun:</strong> Dragðu og slepptu keppendum til að breyta
          ráslista röðun.
        </Typography>
      </Alert>

      {/* Role-specific access info */}
      {userRole === "admin" && (
        <Alert
          severity="success"
          sx={{
            borderRadius: 2,
            mt: 2,
            "& .MuiAlert-message": {
              width: "100%",
            },
          }}
        >
          <Typography variant="body2">
            <Box component="span" fontWeight="bold">
              Keppnisstjóri aðgangur:
            </Box>{" "}
            Þú hefur fullan aðgang að stjórnun þessarar keppni.
          </Typography>
        </Alert>
      )}

      {userRole === "judge" && (
        <Alert
          severity="info"
          sx={{
            borderRadius: 2,
            mt: 2,
            "& .MuiAlert-message": {
              width: "100%",
            },
          }}
        >
          <Typography variant="body2">
            <Box component="span" fontWeight="bold">
              Dómari aðgangur:
            </Box>{" "}
            Þú hefur skoðunaraðgang að þessari keppni.
          </Typography>
        </Alert>
      )}
    </Container>
  );
}

export default ControlPanelDetails;
