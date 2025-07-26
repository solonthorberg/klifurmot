import { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Dialog,
  DialogContent,
  Chip,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  Edit as EditIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";

function JudgeScoring({
  athlete,
  boulderNumber,
  roundOrder,
  competitionId,
  onNext,
  onPrevious,
  onBack,
}) {
  const [score, setScore] = useState({
    zoneAttempts: 0,
    topAttempts: 0,
    gotZone: false,
    gotTop: false,
  });

  const [editMode, setEditMode] = useState(false);
  const [tempScore, setTempScore] = useState(score);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);

    const fetchScore = async () => {
      try {
        const res = await api.get(`/scoring/climbs/`, {
          params: {
            round_order: roundOrder,
            boulder_number: boulderNumber,
            competition_id: competitionId,
            climber_id: athlete.climber_id,
            category_id: athlete.category_id,
          },
        });
        const current = res.data.find(
          (item) => item.climber === athlete.climber_id
        );
        if (current) {
          setScore({
            zoneAttempts: current.attempts_zone || 0,
            topAttempts: current.attempts_top || 0,
            gotZone: current.zone_reached || false,
            gotTop: current.top_reached || false,
          });
        } else {
          setScore({
            zoneAttempts: 0,
            topAttempts: 0,
            gotZone: false,
            gotTop: false,
          });
        }
      } catch (err) {
        console.error("Failed to fetch current score", err);
      }
    };

    fetchScore();
  }, [athlete, boulderNumber, roundOrder, competitionId]);

  const updateBackend = async (newScore) => {
    const payload = {
      climber: athlete.climber_id,
      boulder: athlete.boulder_id,
      competition: competitionId,
      attempts_zone: newScore.zoneAttempts,
      attempts_top: newScore.topAttempts,
      zone_reached: newScore.gotZone,
      top_reached: newScore.gotTop,
    };

    try {
      await api.post(`/scoring/climbs/record_attempt/`, payload);
    } catch (err) {
      console.error("Failed to update score", err);
    }
  };

  const handleScore = (type) => {
    if (editMode || score.gotTop) return;

    const newScore = { ...score };

    if (type === "attempt") {
      if (score.gotZone) {
        newScore.topAttempts += 1;
      } else {
        newScore.zoneAttempts += 1;
        newScore.topAttempts += 1;
      }
    } else if (type === "zone") {
      if (score.gotZone) {
        newScore.topAttempts += 1;
      } else {
        newScore.zoneAttempts += 1;
        newScore.topAttempts += 1;
        newScore.gotZone = true;
      }
    } else if (type === "top") {
      newScore.topAttempts += 1;
      newScore.gotTop = true;

      if (!score.gotZone) {
        newScore.zoneAttempts += 1;
        newScore.gotZone = true;
      }
    }

    setScore(newScore);
    updateBackend(newScore);
  };

  const handleEditChange = (field, delta) => {
    setTempScore((prev) => {
      let newZone = prev.zoneAttempts;
      let newTop = prev.topAttempts;

      if (field === "zoneAttempts") {
        newZone = Math.max(0, newZone + delta);
        if (newZone > newTop) newZone = newTop;
      }

      if (field === "topAttempts") {
        newTop = Math.max(0, newTop + delta);
        if (newZone > newTop) newZone = newTop;
      }

      const updated = {
        ...prev,
        zoneAttempts: newZone,
        topAttempts: newTop,
        gotZone: prev.gotZone && newZone > 0,
        gotTop: prev.gotTop && newTop > 0,
      };

      if (updated.gotZone && updated.zoneAttempts === 0)
        updated.zoneAttempts = 1;
      if (updated.gotTop && updated.topAttempts === 0) updated.topAttempts = 1;

      return updated;
    });
  };

  const toggleBooleanField = (field) => {
    setTempScore((prev) => {
      const updated = { ...prev };

      if (field === "gotZone") {
        if (!prev.gotZone) {
          updated.gotZone = true;
          if (updated.zoneAttempts < 1) updated.zoneAttempts = 1;
        } else if (!prev.gotTop) {
          updated.gotZone = false;
        }
      } else if (field === "gotTop") {
        if (!prev.gotTop) {
          updated.gotTop = true;
          if (!updated.gotZone) updated.gotZone = true;
          if (updated.zoneAttempts < 1) updated.zoneAttempts = 1;
          if (updated.topAttempts < 1) updated.topAttempts = 1;
        } else {
          updated.gotTop = false;
        }
      }

      return updated;
    });
  };

  const handleEditConfirm = () => {
    setScore(tempScore);
    updateBackend(tempScore);
    setEditMode(false);
  };

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          variant="outlined"
          sx={{
            textTransform: "none",
            color: "text.secondary",
            borderColor: "grey.300",
          }}
        >
          Til baka
        </Button>
      </Box>

      <Typography
        variant="h6"
        component="h2"
        sx={{
          textAlign: "center",
          mb: 3,
          fontWeight: 400,
          color: "text.primary",
        }}
      >
        ({athlete.start_order}) {athlete.climber}
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 2,
          borderColor: "grey.300",
          bgcolor: "background.paper",
          width: "100%",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 500 }}>
            Leið {boulderNumber}
          </Typography>
          <IconButton
            onClick={() => {
              setTempScore(score);
              setEditMode(true);
            }}
            size="medium"
            sx={{
              p: 1,
              bgcolor: "grey.100",
              "&:hover": {
                bgcolor: "grey.200",
              },
            }}
          >
            <EditIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 4,
            mb: 4,
            width: "100%",
            px: 2,
          }}
        >
          <Box sx={{ textAlign: "center", flex: 1, maxWidth: 200 }}>
            <Typography
              variant="body1"
              sx={{
                display: "block",
                mb: 2,
                fontWeight: 500,
                color: "text.primary",
              }}
            >
              Tilraunir Zone
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                py: 3,
                px: 3,
                textAlign: "center",
                bgcolor: "white",
                borderColor: "grey.300",
                minHeight: 80,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 2,
              }}
            >
              <Typography variant="h3" sx={{ fontWeight: 500 }}>
                {score.zoneAttempts}
              </Typography>
            </Paper>
            {score.gotZone ? (
              <Chip
                label="Zone"
                sx={{
                  mt: 2,
                  bgcolor: "#ff9800",
                  color: "white",
                  fontSize: "0.875rem",
                  height: 32,
                  px: 2,
                  "& .MuiChip-label": {
                    px: 1,
                  },
                }}
              />
            ) : (
              <Chip
                label="Zone"
                variant="outlined"
                sx={{
                  mt: 2,
                  borderColor: "#ff9800",
                  color: "#ff9800",
                  fontSize: "0.875rem",
                  height: 32,
                  px: 2,
                  "& .MuiChip-label": {
                    px: 1,
                  },
                }}
              />
            )}
          </Box>
          <Box sx={{ textAlign: "center", flex: 1, maxWidth: 200 }}>
            <Typography
              variant="body1"
              sx={{
                display: "block",
                mb: 2,
                fontWeight: 500,
                color: "text.primary",
              }}
            >
              Tilraunir Topp
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                py: 3,
                px: 3,
                textAlign: "center",
                bgcolor: "white",
                borderColor: "grey.300",
                minHeight: 80,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 2,
              }}
            >
              <Typography variant="h3" sx={{ fontWeight: 500 }}>
                {score.topAttempts}
              </Typography>
            </Paper>
            {score.gotTop ? (
              <Chip
                label="Toppur"
                sx={{
                  mt: 2,
                  bgcolor: "#4caf50",
                  color: "white",
                  fontSize: "0.875rem",
                  height: 32,
                  px: 2,
                  "& .MuiChip-label": {
                    px: 1,
                  },
                }}
              />
            ) : (
              <Chip
                label="Toppur"
                variant="outlined"
                sx={{
                  mt: 2,
                  borderColor: "#4caf50",
                  color: "#4caf50",
                  fontSize: "0.875rem",
                  height: 32,
                  px: 2,
                  "& .MuiChip-label": {
                    px: 1,
                  },
                }}
              />
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxWidth: 400,
            mx: "auto",
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={() => handleScore("top")}
            disabled={editMode || score.gotTop}
            sx={{
              py: 2,
              bgcolor: "#e8f5e8",
              color: "#2e7d32",
              textTransform: "none",
              fontWeight: 500,
              fontSize: "1.1rem",
              boxShadow: "none",
              border: "1px solid #a5d6a7",
              borderRadius: 2,
              "&:hover": {
                bgcolor: "#c8e6c9",
                boxShadow: "none",
              },
              "&:disabled": {
                bgcolor: "#f5f5f5",
                color: "#bdbdbd",
                border: "1px solid #e0e0e0",
              },
            }}
          >
            Toppur
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => handleScore("zone")}
            disabled={editMode || score.gotTop}
            sx={{
              py: 2,
              bgcolor: "#fff3e0",
              color: "#f57c00",
              textTransform: "none",
              fontWeight: 500,
              fontSize: "1.1rem",
              boxShadow: "none",
              border: "1px solid #ffcc02",
              borderRadius: 2,
              "&:hover": {
                bgcolor: "#ffe0b2",
                boxShadow: "none",
              },
              "&:disabled": {
                bgcolor: "#f5f5f5",
                color: "#bdbdbd",
                border: "1px solid #e0e0e0",
              },
            }}
          >
            Zone
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => handleScore("attempt")}
            disabled={editMode || score.gotTop}
            sx={{
              py: 2,
              bgcolor: "#f5f5f5",
              color: "#757575",
              textTransform: "none",
              fontWeight: 500,
              fontSize: "1.1rem",
              boxShadow: "none",
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              "&:hover": {
                bgcolor: "#eeeeee",
                boxShadow: "none",
              },
              "&:disabled": {
                bgcolor: "#f5f5f5",
                color: "#bdbdbd",
                border: "1px solid #e0e0e0",
              },
            }}
          >
            Tilraun
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
        <Button
          variant="contained"
          size="large"
          onClick={onPrevious}
          disabled={editMode}
          sx={{
            py: 1.5,
            bgcolor: "#9e9e9e",
            color: "white",
            textTransform: "none",
            fontWeight: 400,
            boxShadow: "none",
            flex: 1,
            "&:hover": {
              bgcolor: "#757575",
              boxShadow: "none",
            },
            "&:disabled": {
              bgcolor: "#e0e0e0",
              color: "#bdbdbd",
            },
          }}
        >
          Fyrri
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={onNext}
          disabled={editMode}
          sx={{
            py: 1.5,
            borderColor: "#9e9e9e",
            color: "#424242",
            textTransform: "none",
            fontWeight: 400,
            flex: 1,
            "&:hover": {
              borderColor: "#757575",
              color: "#212121",
              bgcolor: "rgba(158, 158, 158, 0.04)",
            },
            "&:disabled": {
              borderColor: "#e0e0e0",
              color: "#bdbdbd",
            },
          }}
        >
          Næsti
        </Button>
      </Box>

      <Dialog
        open={editMode}
        onClose={() => setEditMode(false)}
        maxWidth={false}
        sx={{
          "& .MuiDialog-container": {
            alignItems: "center",
            justifyContent: "center",
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: 450,
            maxWidth: "90vw",
            margin: 0,
            position: "relative",
          },
        }}
      >
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 500 }}>
              Leið {boulderNumber}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              mb: 4,
              width: "100%",
            }}
          >
            <Box sx={{ textAlign: "center", minWidth: 120 }}>
              <Typography
                variant="body1"
                sx={{
                  mb: 3,
                  fontWeight: 500,
                  color: "text.primary",
                }}
              >
                Tilraunir Zone
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <IconButton
                  onClick={() => handleEditChange("zoneAttempts", 1)}
                  size="large"
                  sx={{
                    bgcolor: "grey.100",
                    width: 48,
                    height: 48,
                    "&:hover": {
                      bgcolor: "grey.200",
                    },
                  }}
                >
                  <ArrowUpIcon fontSize="large" />
                </IconButton>
                <Paper
                  variant="outlined"
                  sx={{
                    py: 3,
                    px: 4,
                    textAlign: "center",
                    bgcolor: "white",
                    borderColor: "grey.300",
                    minHeight: 80,
                    minWidth: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h3" sx={{ fontWeight: 500 }}>
                    {tempScore.zoneAttempts}
                  </Typography>
                </Paper>
                <IconButton
                  onClick={() => handleEditChange("zoneAttempts", -1)}
                  size="large"
                  sx={{
                    bgcolor: "grey.100",
                    width: 48,
                    height: 48,
                    "&:hover": {
                      bgcolor: "grey.200",
                    },
                  }}
                >
                  <ArrowDownIcon fontSize="large" />
                </IconButton>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mt: 2,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={tempScore.gotZone}
                        onChange={() => toggleBooleanField("gotZone")}
                        disabled={tempScore.gotTop}
                        size="medium"
                        sx={{
                          color: "#ff9800",
                          "&.Mui-checked": {
                            color: "#ff9800",
                          },
                          "&.Mui-disabled": {
                            color: "#bdbdbd",
                          },
                          "& .MuiSvgIcon-root": {
                            fontSize: 28,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 500,
                          color: tempScore.gotTop ? "#bdbdbd" : "text.primary",
                        }}
                      >
                        Zone náð
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={{ textAlign: "center", minWidth: 120 }}>
              <Typography
                variant="body1"
                sx={{
                  mb: 3,
                  fontWeight: 500,
                  color: "text.primary",
                }}
              >
                Tilraunir Topp
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <IconButton
                  onClick={() => handleEditChange("topAttempts", 1)}
                  size="large"
                  sx={{
                    bgcolor: "grey.100",
                    width: 48,
                    height: 48,
                    "&:hover": {
                      bgcolor: "grey.200",
                    },
                  }}
                >
                  <ArrowUpIcon fontSize="large" />
                </IconButton>
                <Paper
                  variant="outlined"
                  sx={{
                    py: 3,
                    px: 4,
                    textAlign: "center",
                    bgcolor: "white",
                    borderColor: "grey.300",
                    minHeight: 80,
                    minWidth: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h3" sx={{ fontWeight: 500 }}>
                    {tempScore.topAttempts}
                  </Typography>
                </Paper>
                <IconButton
                  onClick={() => handleEditChange("topAttempts", -1)}
                  size="large"
                  sx={{
                    bgcolor: "grey.100",
                    width: 48,
                    height: 48,
                    "&:hover": {
                      bgcolor: "grey.200",
                    },
                  }}
                >
                  <ArrowDownIcon fontSize="large" />
                </IconButton>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mt: 2,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={tempScore.gotTop}
                        onChange={() => toggleBooleanField("gotTop")}
                        size="medium"
                        sx={{
                          color: "#4caf50",
                          "&.Mui-checked": {
                            color: "#4caf50",
                          },
                          "& .MuiSvgIcon-root": {
                            fontSize: 28,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 500,
                          color: "text.primary",
                        }}
                      >
                        Topp náð
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: "center",
              maxWidth: 400,
              mx: "auto",
            }}
          >
            <Button
              onClick={() => setEditMode(false)}
              variant="outlined"
              size="large"
              sx={{
                py: 2,
                px: 4,
                textTransform: "none",
                fontWeight: 500,
                fontSize: "1.1rem",
                borderRadius: 2,
                flex: 1,
              }}
            >
              Hætta
            </Button>
            <Button
              onClick={handleEditConfirm}
              variant="contained"
              size="large"
              sx={{
                py: 2,
                px: 4,
                textTransform: "none",
                fontWeight: 500,
                fontSize: "1.1rem",
                borderRadius: 2,
                flex: 1,
              }}
            >
              Samþykkja
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default JudgeScoring;
