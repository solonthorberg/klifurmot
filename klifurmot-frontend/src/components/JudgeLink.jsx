import { useState, useEffect } from "react";
import api from "../services/api";
import dayjs from "dayjs";
import { useNotification } from "../context/NotificationContext";
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
  CircularProgress,
  InputAdornment,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
} from "@mui/material";
import { MobileDateTimePicker } from "@mui/x-date-pickers/MobileDateTimePicker";
import {
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Save as SaveIcon,
} from "@mui/icons-material";

function JudgeLinkSection({ competitionId }) {
  const [inviteMethod, setInviteMethod] = useState("email");
  const [availableJudges, setAvailableJudges] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [allLinks, setAllLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [editingLink, setEditingLink] = useState(null);
  const [editExpiration, setEditExpiration] = useState("");

  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  useEffect(() => {
    fetchAvailableJudges();
    fetchAllLinks();
    const tomorrow = dayjs().add(1, "day");
    setExpirationDate(tomorrow.format("YYYY-MM-DDTHH:mm"));
  }, [competitionId]);

  const getJudgeName = (userId) => {
    const judge = availableJudges.find((j) => j.id === userId);
    return judge ? judge.full_name || judge.username : "Óþekktur notandi";
  };

  const renderLinkDisplay = (link) => {
    if (link.type === "invitation") {
      return `${link.invited_email} ${
        link.invited_name ? `(${link.invited_name})` : ""
      }`;
    } else {
      return `${link.user_email || getJudgeName(link.user_id)}`;
    }
  };

  const isLinkExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  const getStatusChip = (link) => {
    if (isLinkExpired(link.expires_at)) {
      return <Chip label="Útrunnin" color="error" size="small" />;
    } else if (link.type === "invitation" && link.claimed_at) {
      return <Chip label="Sótt" color="success" size="small" />;
    } else if (link.type === "invitation") {
      return <Chip label="Bíður" color="warning" size="small" />;
    } else {
      return <Chip label="Virk" color="success" size="small" />;
    }
  };

  const fetchAvailableJudges = async () => {
    try {
      const res = await api.get("/accounts/user-accounts/");
      setAvailableJudges(res.data);
    } catch (err) {
      console.error("Failed to fetch judges:", err);
    }
  };

  const fetchAllLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const [linksRes, invitationsRes] = await Promise.all([
        api
          .get(`/accounts/judge-links/${competitionId}/`)
          .catch(() => ({ data: [] })),
        api
          .get(`/accounts/judge-invitations/competition/${competitionId}/`)
          .catch(() => ({ data: [] })),
      ]);

      const combined = [...linksRes.data, ...invitationsRes.data];
      console.log("Combined links:", combined);
      setAllLinks(combined);
    } catch (err) {
      console.error("Failed to fetch links:", err);
      setAllLinks([]);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const generateJudgeLink = async () => {
    if (inviteMethod === "existing" && !selectedJudge) {
      showWarning("Veldu dómara fyrst");
      return;
    }

    if (inviteMethod === "email" && !inviteEmail) {
      showWarning("Settu inn netfang");
      return;
    }

    if (!expirationDate) {
      showWarning("Veldu gildistíma fyrst");
      return;
    }

    setIsGenerating(true);
    try {
      let payload;
      let endpoint;

      if (inviteMethod === "email") {
        payload = {
          email: inviteEmail,
          name: inviteName,
          expires_at: new Date(expirationDate).toISOString(),
        };
        endpoint = `/accounts/judge-invitations/${competitionId}/`;
      } else {
        // Use the correct endpoint for existing users
        payload = {
          user_id: selectedJudge,
          expires_at: new Date(expirationDate).toISOString(),
        };
        endpoint = `/accounts/judge-links/competition/${competitionId}/`;
      }

      const res = await api.post(endpoint, payload);

      // Handle response based on method
      if (inviteMethod === "email") {
        const recipientEmail = res.data.email || inviteEmail;
        if (res.data.type === "existing_user") {
          showSuccess(
            `Dómaraslóð búin til fyrir ${recipientEmail} (núverandi notandi)`
          );
        } else {
          showSuccess(`Boð sent til ${recipientEmail}`);
        }
      } else {
        const selectedUser = availableJudges.find(
          (j) => j.id === selectedJudge
        );
        const userEmail =
          selectedUser?.user?.email ||
          selectedUser?.email ||
          res.data.user_email;
        showSuccess(
          `Dómaraslóð ${
            res.data.created ? "búin til" : "uppfærð"
          } fyrir ${userEmail}`
        );
      }

      // Reset form
      setSelectedJudge("");
      setInviteEmail("");
      setInviteName("");
      const tomorrow = dayjs().add(1, "day");
      setExpirationDate(tomorrow.format("YYYY-MM-DDTHH:mm"));

      await fetchAllLinks();
    } catch (err) {
      console.error("Failed to generate judge link:", err);
      showError(
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
      showSuccess("Slóð afrituð í klemmuspjald");
    } catch (err) {
      console.error("Failed to copy:", err);
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      showSuccess("Slóð afrituð í klemmuspjald");
    }
  };

  const deleteJudgeLink = async (linkId) => {
    try {
      await api.delete(`/accounts/judge-links/link/${linkId}/`);
      console.log("Judge link deleted");
      showSuccess("Dómaraslóð eytt");
      await fetchAllLinks();
    } catch (err) {
      console.error("Failed to delete judge link:", err);
      showError(
        `Ekki tókst að eyða dómaraslóð: ${
          err.response?.data?.detail || err.message
        }`
      );
    }
  };

  const handleDeleteClick = (link) => {
    const linkName = renderLinkDisplay(link);

    if (
      window.confirm(
        `Ertu viss um að þú viljir eyða dómaraslóð fyrir ${linkName}?`
      )
    ) {
      deleteJudgeLink(link.id);
    }
  };

  const updateJudgeLink = async (linkId, newExpirationDate) => {
    try {
      await api.patch(`/accounts/judge-links/link/${linkId}/`, {
        expires_at: dayjs(newExpirationDate).toISOString(),
      });
      console.log("Judge link updated");
      setEditingLink(null);
      setEditExpiration("");
      showSuccess("Dómaraslóð uppfærð");
      await fetchAllLinks();
    } catch (err) {
      console.error("Failed to update judge link:", err);
      showError(
        `Ekki tókst að uppfæra dómaraslóð: ${
          err.response?.data?.detail || err.message
        }`
      );
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
        <Box sx={{ mb: 4 }}>
          <RadioGroup
            value={inviteMethod}
            onChange={(e) => setInviteMethod(e.target.value)}
            row
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="email"
              control={<Radio />}
              label="Nýr Dómari"
            />
            <FormControlLabel
              value="existing"
              control={<Radio />}
              label="Velja Dómara"
            />
          </RadioGroup>

          {inviteMethod === "email" ? (
            <Box
              sx={{ display: "flex", gap: 2, flexDirection: "column", mb: 2 }}
            >
              <TextField
                label="Netfang"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <EmailIcon sx={{ mr: 1, color: "action.disabled" }} />
                  ),
                }}
              />
              <TextField
                label="Nafn (Valkvætt)"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <PersonIcon sx={{ mr: 1, color: "action.disabled" }} />
                  ),
                }}
              />
            </Box>
          ) : (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Veldu Dómara</InputLabel>
              <Select
                value={selectedJudge}
                onChange={(e) => setSelectedJudge(e.target.value)}
                label="Veldu Dómara"
              >
                {availableJudges.map((judge) => (
                  <MenuItem key={judge.id} value={judge.id}>
                    {judge.full_name || judge.user?.username || judge.username}{" "}
                    ({judge.user?.email || judge.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <MobileDateTimePicker
              label="Gildistími"
              value={expirationDate ? dayjs(expirationDate) : null}
              onChange={(newValue) => {
                const dateString = newValue
                  ? newValue.format("YYYY-MM-DDTHH:mm")
                  : "";
                setExpirationDate(dateString);
              }}
              format="DD/MM/YYYY HH:mm"
              ampm={false}
              minDateTime={dayjs()}
              sx={{ flex: 1 }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "medium",
                  required: true,
                },
              }}
            />
            <Button
              variant="contained"
              onClick={generateJudgeLink}
              disabled={isGenerating}
              sx={{ height: 56, minWidth: 120 }}
            >
              {isGenerating ? <CircularProgress size={24} /> : "Búa til"}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Allir Dómarar
          </Typography>

          {isLoadingLinks ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          ) : allLinks.length === 0 ? (
            <Alert severity="info">Engir dómarar valdnir</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Dómari</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Slóð</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Gildistími
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Staða</TableCell>
                    <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>
                      Aðgerðir
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allLinks.map((link) => (
                    <TableRow
                      key={`${link.type}-${link.id}`}
                      sx={{ "&:hover": { backgroundColor: "grey.50" } }}
                    >
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="body2" fontWeight="medium">
                            {renderLinkDisplay(link)}
                          </Typography>
                          <Chip
                            label={link.type === "invitation" ? "Boð" : "Slóð"}
                            size="small"
                            color={
                              link.type === "invitation"
                                ? "secondary"
                                : "primary"
                            }
                          />
                        </Box>
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
                                    <CopyIcon />
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
                              value={dayjs(editExpiration || link.expires_at)}
                              onChange={(newValue) => {
                                setEditExpiration(
                                  newValue ? newValue.toISOString() : ""
                                );
                              }}
                              format="DD/MM/YYYY HH:mm"
                              ampm={false}
                              slotProps={{
                                textField: { size: "small" },
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() =>
                                updateJudgeLink(link.id, editExpiration)
                              }
                              title="Vista"
                            >
                              <SaveIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingLink(null);
                                setEditExpiration("");
                              }}
                              title="Hætta við"
                            >
                              <CloseIcon />
                            </IconButton>
                          </Box>
                        ) : (
                          <Typography variant="body2">
                            {dayjs(link.expires_at).format("DD/MM/YYYY HH:mm")}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{getStatusChip(link)}</TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "center",
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingLink(link.id);
                              setEditExpiration(link.expires_at);
                            }}
                            title="Breyta"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(link)}
                            title="Eyða"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
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
