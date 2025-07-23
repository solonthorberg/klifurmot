import React, { useState, useEffect } from "react";
import api from "../services/api";
import dayjs from "dayjs";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  InputAdornment,
  Divider,
} from "@mui/material";
import { MobileDateTimePicker } from "@mui/x-date-pickers/MobileDateTimePicker";
import {
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Gavel as JudgeIcon,
} from "@mui/icons-material";

function JudgeLinkSection({ competitionId }) {
  const [availableJudges, setAvailableJudges] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [existingLinks, setExistingLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [editingLink, setEditingLink] = useState(null);

  useEffect(() => {
    fetchAvailableJudges();
    fetchExistingLinks();
    // Set default expiration to tomorrow
    const tomorrow = dayjs().add(1, "day");
    setExpirationDate(tomorrow.format("YYYY-MM-DDTHH:mm"));
  }, []);

  const fetchAvailableJudges = async () => {
    try {
      const res = await api.get("/accounts/user-accounts/");
      setAvailableJudges(res.data);
    } catch (err) {
      console.error("Failed to fetch judges:", err);
    }
  };

  const fetchExistingLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const res = await api.get(
        `/accounts/judge-links/competition/${competitionId}/`
      );
      setExistingLinks(res.data);
    } catch (err) {
      console.error("Failed to fetch existing links:", err);
      setExistingLinks([]);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const generateJudgeLink = async () => {
    if (!selectedJudge) {
      alert("Veldu dómara fyrst");
      return;
    }

    if (!expirationDate) {
      alert("Veldu gildistíma fyrst");
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        user_id: selectedJudge,
        expires_at: new Date(expirationDate).toISOString(),
      };

      const res = await api.post(
        `/accounts/judge-links/${competitionId}/`,
        payload
      );

      console.log("Judge link generated:", res.data.judge_link);

      if (res.data.role_assigned) {
        console.log("Judge role automatically assigned");
      }

      // Reset form
      setSelectedJudge("");
      const tomorrow = dayjs().add(1, "day");
      setExpirationDate(tomorrow.format("YYYY-MM-DDTHH:mm"));

      await fetchExistingLinks();
    } catch (err) {
      console.error("Failed to generate judge link:", err);
      alert(
        `Ekki tókst að búa til dómaraslóð: ${
          err.response?.data?.detail || err.message
        }`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const deleteJudgeLink = async (linkId) => {
    if (!confirm("Ertu viss um að þú viljir eyða þessari dómaraslóð?")) {
      return;
    }

    try {
      await api.delete(`/accounts/judge-links/link/${linkId}/`);
      console.log("Judge link deleted");
      await fetchExistingLinks();
    } catch (err) {
      console.error("Failed to delete judge link:", err);
      alert(
        `Ekki tókst að eyða dómaraslóð: ${
          err.response?.data?.detail || err.message
        }`
      );
    }
  };

  const handleExpirationDateChange = (newValue) => {
    const dateString = newValue ? newValue.format("YYYY-MM-DDTHH:mm") : "";
    setExpirationDate(dateString);
  };

  const updateJudgeLink = async (linkId, newExpirationDate) => {
    try {
      await api.patch(`/accounts/judge-links/link/${linkId}/`, {
        expires_at: dayjs(newExpirationDate).toISOString(),
      });
      console.log("Judge link updated");
      setEditingLink(null);
      await fetchExistingLinks();
    } catch (err) {
      console.error("Failed to update judge link:", err);
      alert(
        `Ekki tókst að uppfæra dómaraslóð: ${
          err.response?.data?.detail || err.message
        }`
      );
    }
  };

  const getJudgeName = (userId) => {
    const judge = availableJudges.find((j) => j.id === userId);
    return judge ? judge.full_name || judge.username : "Óþekktur notandi";
  };

  const isLinkExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  const getStatusChip = (link) => {
    if (isLinkExpired(link.expires_at)) {
      return <Chip label="Útrunnin" color="error" size="small" />;
    } else {
      return <Chip label="Virk" color="success" size="small" />;
    }
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Dómaraslóðir
            </Typography>
          </Box>
        }
      />
      <CardContent>
        {/* Create New Judge Link Section */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "end" },
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
              <FormControl
                fullWidth
                size="small"
                sx={{
                  mb: { xs: 0, sm: 0 },
                  width: "100%",
                }}
              >
                <InputLabel id="judge-select-label">Veldu dómara</InputLabel>
                <Select
                  labelId="judge-select-label"
                  id="judge-select"
                  value={selectedJudge || ""}
                  onChange={(e) => setSelectedJudge(e.target.value)}
                  label="Veldu dómara"
                  fullWidth
                  sx={{
                    textTransform: "none",
                    width: "100%",
                  }}
                >
                  {availableJudges.map((judge) => (
                    <MenuItem key={judge.id} value={judge.id}>
                      {judge.full_name || judge.username}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ minWidth: { xs: "100%", sm: 200 } }}>
              <MobileDateTimePicker
                label="Gildistími"
                value={expirationDate ? dayjs(expirationDate) : null}
                onChange={handleExpirationDateChange}
                format="DD/MM/YYYY HH:mm"
                ampm={false}
                minDateTime={dayjs()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    required: true,
                  },
                }}
              />
            </Box>

            <Button
              variant="contained"
              onClick={generateJudgeLink}
              disabled={!selectedJudge || !expirationDate || isGenerating}
              sx={{
                alignSelf: { xs: "stretch", sm: "auto" },
                minWidth: { xs: "100%", sm: 120 },
                textTransform: "none",
              }}
            >
              {isGenerating ? "Býr til..." : "Búa til slóð"}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Existing Judge Links Section */}
        <Box>
          {isLoadingLinks ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          ) : existingLinks.length === 0 ? (
            <Typography
              color="text.secondary"
              sx={{ textAlign: "center", py: 3 }}
            >
              Engar dómaraslóðir til staðar
            </Typography>
          ) : (
            // Mobile view - Card layout
            <Box sx={{ display: { xs: "block", md: "none" } }}>
              {existingLinks.map((link) => (
                <Card key={link.id} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Dómari
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {getJudgeName(link.user_id)}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Dómaraslóð
                      </Typography>
                      <TextField
                        size="small"
                        value={link.judge_link}
                        InputProps={{
                          readOnly: true,
                          style: { fontSize: "0.75rem" },
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => copyToClipboard(link.judge_link)}
                                title="Afrita slóð"
                              >
                                {linkCopied ? (
                                  <CheckIcon color="success" />
                                ) : (
                                  <CopyIcon />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        fullWidth
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Best fyrir
                      </Typography>
                      {editingLink === link.id ? (
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <MobileDateTimePicker
                            value={dayjs(link.expires_at)}
                            onChange={(newValue) => {
                              link.newExpirationDate = newValue
                                ? newValue.format("YYYY-MM-DDTHH:mm")
                                : "";
                            }}
                            format="DD/MM/YYYY HH:mm"
                            ampm={false}
                            minDateTime={dayjs()}
                            slotProps={{
                              textField: {
                                size: "small",
                                fullWidth: true,
                              },
                            }}
                          />
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() =>
                              updateJudgeLink(link.id, link.newExpirationDate)
                            }
                            title="Vista"
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setEditingLink(null)}
                            title="Hætta við"
                          >
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="body2">
                            {dayjs(link.expires_at).format("DD/MM/YYYY HH:mm")}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => setEditingLink(link.id)}
                            title="Breyta gildistíma"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Staða
                        </Typography>
                        {getStatusChip(link)}
                      </Box>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteJudgeLink(link.id)}
                        title="Eyða slóð"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* Desktop view - Table layout */}
          {!isLoadingLinks && existingLinks.length > 0 && (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ display: { xs: "none", md: "block" } }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Dómari</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Dómaraslóð
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Best fyrir
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Staða</TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        width: 100,
                        textAlign: "center",
                      }}
                    >
                      Aðgerðir
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {existingLinks.map((link) => (
                    <TableRow
                      key={link.id}
                      sx={{ "&:hover": { backgroundColor: "grey.50" } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {getJudgeName(link.user_id)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <TextField
                            size="small"
                            value={link.judge_link}
                            InputProps={{
                              readOnly: true,
                              style: { fontSize: "0.75rem" },
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      copyToClipboard(link.judge_link)
                                    }
                                    title="Afrita slóð"
                                  >
                                    {linkCopied ? (
                                      <CheckIcon color="success" />
                                    ) : (
                                      <CopyIcon />
                                    )}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                            sx={{ flex: 1 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {editingLink === link.id ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <MobileDateTimePicker
                              value={dayjs(link.expires_at)}
                              onChange={(newValue) => {
                                link.newExpirationDate = newValue
                                  ? newValue.format("YYYY-MM-DDTHH:mm")
                                  : "";
                              }}
                              format="DD/MM/YYYY HH:mm"
                              ampm={false}
                              minDateTime={dayjs()}
                              slotProps={{
                                textField: {
                                  size: "small",
                                  sx: { minWidth: 200 },
                                },
                              }}
                            />
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() =>
                                updateJudgeLink(link.id, link.newExpirationDate)
                              }
                              title="Vista"
                            >
                              <CheckIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setEditingLink(null)}
                              title="Hætta við"
                            >
                              <CloseIcon />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography variant="body2">
                              {dayjs(link.expires_at).format(
                                "DD/MM/YYYY HH:mm"
                              )}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => setEditingLink(link.id)}
                              title="Breyta gildistíma"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>{getStatusChip(link)}</TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteJudgeLink(link.id)}
                          title="Eyða slóð"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default JudgeLinkSection;
