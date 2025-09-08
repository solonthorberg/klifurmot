import { useState, useEffect } from "react";
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
  CircularProgress,
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
  Check as CheckIcon,
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
  const [linkCopied, setLinkCopied] = useState(false);
  const [allLinks, setAllLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [editingLink, setEditingLink] = useState(null);
  const [editExpiration, setEditExpiration] = useState("");

  useEffect(() => {
    fetchAvailableJudges();
    fetchAllLinks();
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

  const fetchAllLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const [linksRes, invitationsRes] = await Promise.all([
        api
          .get(`/accounts/judge-links/competition/${competitionId}/`)
          .catch(() => ({ data: [] })),
        api
          .get(`/accounts/judge-invitations/competition/${competitionId}/`)
          .catch(() => ({ data: [] })),
      ]);

      const combined = [...linksRes.data, ...invitationsRes.data];
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
      alert("Please select a judge");
      return;
    }

    if (inviteMethod === "email" && !inviteEmail) {
      alert("Please enter an email address");
      return;
    }

    setIsGenerating(true);
    try {
      let payload;

      if (inviteMethod === "email") {
        payload = {
          email: inviteEmail,
          name: inviteName,
          expires_at: new Date(expirationDate).toISOString(),
        };
      } else {
        const selectedUser = availableJudges.find(
          (j) => j.id === selectedJudge
        );
        if (!selectedUser) {
          alert("Selected user not found");
          setIsGenerating(false);
          return;
        }

        payload = {
          email: selectedUser.user?.email || selectedUser.email,
          name: selectedUser.full_name || selectedUser.user?.username || "",
          expires_at: new Date(expirationDate).toISOString(),
        };
      }

      const res = await api.post(
        `/accounts/judge-invitations/${competitionId}/`,
        payload
      );

      if (res.data.type === "existing_user") {
        alert(`Link created for ${selectedUser} (existing user)`);
      } else {
        alert(`Invitation sent to ${res.data.email}`);
      }

      setInviteEmail("");
      setInviteName("");
      setSelectedJudge("");
      await fetchAllLinks();
    } catch (err) {
      console.error("Failed to generate link:", err);
      alert(`Failed: ${err.response?.data?.detail || err.message}`);
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
    if (!confirm("Are you sure you want to delete this link?")) {
      return;
    }

    try {
      await api.delete(`/accounts/judge-links/link/${linkId}/`);
      await fetchAllLinks();
    } catch (err) {
      alert(`Failed to delete: ${err.response?.data?.detail || err.message}`);
    }
  };

  const startEdit = (link) => {
    setEditingLink(link.id);
    setEditExpiration(dayjs(link.expires_at).format("YYYY-MM-DDTHH:mm"));
  };

  const cancelEdit = () => {
    setEditingLink(null);
    setEditExpiration("");
  };

  const saveEdit = async (linkId) => {
    try {
      await api.patch(`/accounts/judge-links/link/${linkId}/`, {
        expires_at: new Date(editExpiration).toISOString(),
      });
      await fetchAllLinks();
      setEditingLink(null);
      setEditExpiration("");
    } catch (err) {
      alert(`Failed to update: ${err.response?.data?.detail || err.message}`);
    }
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  const getStatusChip = (link) => {
    if (link.claimed_at) {
      return <Chip label="Claimed" color="success" size="small" />;
    } else if (link.is_used) {
      return <Chip label="Used" color="info" size="small" />;
    } else if (isExpired(link.expires_at)) {
      return <Chip label="Expired" color="error" size="small" />;
    } else {
      return <Chip label="Active" color="success" size="small" />;
    }
  };

  return (
    <Card>
      <CardHeader title="Dómaraslóðir" />
      <CardContent>
        <Box sx={{ mb: 4 }}>
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <RadioGroup
              row
              value={inviteMethod}
              onChange={(e) => setInviteMethod(e.target.value)}
            >
              <FormControlLabel
                value="email"
                control={<Radio />}
                label="Nýr Dómari"
              />
              <FormControlLabel
                value="existing"
                control={<Radio />}
                label="Velja dómara"
              />
            </RadioGroup>
          </FormControl>

          {inviteMethod === "email" ? (
            <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
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
            <FormControl fullWidth>
              <InputLabel>Veldu Dómara</InputLabel>
              <Select
                value={selectedJudge}
                onChange={(e) => setSelectedJudge(e.target.value)}
                label="Select Judge"
              >
                {availableJudges.map((judge) => (
                  <MenuItem key={judge.id} value={judge.id}>
                    {judge.full_name || judge.user?.username} (
                    {judge.user?.email || judge.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box sx={{ mt: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <MobileDateTimePicker
              label="Gildistími"
              value={dayjs(expirationDate)}
              onChange={(newValue) =>
                setExpirationDate(newValue.format("YYYY-MM-DDTHH:mm"))
              }
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              onClick={generateJudgeLink}
              disabled={isGenerating}
              sx={{ height: 56 }}
            >
              {isGenerating ? <CircularProgress size={24} /> : "Búa til beiðni"}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ mb: 2 }}>
          Allir Dómarar
        </Typography>

        {isLoadingLinks ? (
          <CircularProgress />
        ) : allLinks.length === 0 ? (
          <Alert severity="info">Engir dómarar valdnir</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableBody>
                {allLinks.map((link) => (
                  <TableRow key={`${link.type}-${link.id}`}>
                    <TableCell>
                      <Chip
                        label={
                          link.type === "invitation" ? "Nýr Notandi" : "Línkur"
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {link.type === "invitation"
                        ? `${link.invited_email} ${
                            link.invited_name ? `(${link.invited_name})` : ""
                          }`
                        : link.user_email}
                      {link.claimed_by && (
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                        >
                          Claimed by: {link.claimed_by}
                        </Typography>
                      )}
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
                          }}
                          sx={{ width: 300 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(link.judge_link)}
                        >
                          {linkCopied ? (
                            <CheckIcon color="success" />
                          ) : (
                            <CopyIcon />
                          )}
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {editingLink === link.id ? (
                        <MobileDateTimePicker
                          value={dayjs(editExpiration)}
                          onChange={(newValue) =>
                            setEditExpiration(
                              newValue.format("YYYY-MM-DDTHH:mm")
                            )
                          }
                          slotProps={{
                            textField: {
                              size: "small",
                              sx: { width: 180 },
                            },
                          }}
                        />
                      ) : (
                        dayjs(link.expires_at).format("YYYY-MM-DD HH:mm")
                      )}
                    </TableCell>
                    <TableCell>{getStatusChip(link)}</TableCell>
                    <TableCell>
                      {editingLink === link.id ? (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => saveEdit(link.id)}
                            color="primary"
                          >
                            <SaveIcon />
                          </IconButton>
                          <IconButton size="small" onClick={cancelEdit}>
                            <CloseIcon />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => startEdit(link)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => deleteJudgeLink(link.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default JudgeLinkSection;
