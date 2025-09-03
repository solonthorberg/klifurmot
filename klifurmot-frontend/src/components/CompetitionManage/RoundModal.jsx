import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  FormControlLabel,
  Switch,
  Typography,
} from "@mui/material";
import api from "../../services/api";

function RoundModal({ existingRound, onClose, onSelectRound }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roundGroups, setRoundGroups] = useState([]);
  const [formData, setFormData] = useState({
    roundGroupId: "",
    athleteCount: "",
    boulderCount: "",
    selfScoring: false,
  });
  const [errors, setErrors] = useState({});

  const setFormField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  useEffect(() => {
    const fetchRoundGroups = async () => {
      try {
        const response = await api.get("/competitions/round-groups/");
        setRoundGroups(response.data);

        if (existingRound) {
          setFormData({
            roundGroupId: existingRound.round_group_id?.toString() || "",
            athleteCount: existingRound.athlete_count?.toString() || "",
            boulderCount: existingRound.boulder_count?.toString() || "",
            selfScoring: existingRound.is_self_scoring ?? false,
          });
        }
      } catch (err) {
        console.error("Failed to fetch round groups:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoundGroups();
  }, [existingRound]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.roundGroupId) {
      newErrors.roundGroupId = "Veldu umferð";
    }
    if (!formData.athleteCount || parseInt(formData.athleteCount) < 1) {
      newErrors.athleteCount = "Sláðu inn gilt fjölda keppenda (1 eða fleiri)";
    }
    if (!formData.boulderCount || parseInt(formData.boulderCount) < 1) {
      newErrors.boulderCount = "Sláðu inn gilt fjölda leiða (1 eða fleiri)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const roundPayload = {
        round_group_id: formData.roundGroupId,
        name: roundGroups.find(
          (rg) => rg.id.toString() === formData.roundGroupId
        )?.name,
        athlete_count: parseInt(formData.athleteCount),
        boulder_count: parseInt(formData.boulderCount),
        is_self_scoring: formData.selfScoring,
      };

      if (isEditMode) {
        roundPayload._id = existingRound._id;
        roundPayload.roundId = existingRound.roundId;
      }

      onSelectRound(roundPayload);
    } catch (error) {
      console.error("Error saving round:", error);
    } finally {
      setSaving(false);
    }
  };

  const isEditMode = !!existingRound;

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={saving}
    >
      <DialogTitle>
        {isEditMode ? "Breyta umferð" : "Búa til nýja umferð"}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 2 }}>
            <FormControl fullWidth error={!!errors.roundGroupId}>
              <InputLabel>Umferð</InputLabel>
              <Select
                value={formData.roundGroupId}
                onChange={(e) => setFormField("roundGroupId", e.target.value)}
                disabled={isEditMode}
                label="Umferð"
              >
                {roundGroups.map((rg) => (
                  <MenuItem key={rg.id} value={rg.id}>
                    {rg.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.roundGroupId && (
                <Box
                  component="span"
                  sx={{ color: "error.main", fontSize: "0.75rem", mt: 0.5 }}
                >
                  {errors.roundGroupId}
                </Box>
              )}
            </FormControl>
            <TextField
              fullWidth
              label="Fjöldi keppenda"
              type="number"
              value={formData.athleteCount}
              onChange={(e) => setFormField("athleteCount", e.target.value)}
              error={!!errors.athleteCount}
              helperText={errors.athleteCount}
              inputProps={{ min: 1, max: 100 }}
            />
            <TextField
              fullWidth
              label="Fjöldi leiða"
              type="number"
              value={formData.boulderCount}
              onChange={(e) => setFormField("boulderCount", e.target.value)}
              error={!!errors.boulderCount}
              helperText={errors.boulderCount}
              inputProps={{ min: 1, max: 20 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.selfScoring}
                  onChange={(e) =>
                    setFormField("selfScoring", e.target.checked)
                  }
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Self scoring round</Typography>
                </Box>
              }
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} color="secondary">
          Hætta við
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading || saving}
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : null}
        >
          {saving ? "Vista..." : isEditMode ? "Vista" : "Staðfesta"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RoundModal;
