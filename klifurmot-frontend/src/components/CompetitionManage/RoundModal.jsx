// RoundModal.jsx - Clean Version Without Draft Messages
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchRoundGroups = async () => {
      try {
        const response = await api.get("/competitions/round-groups/");
        setRoundGroups(response.data);

        // If editing existing round, populate fields
        if (existingRound) {
          setFormData({
            roundGroupId: existingRound.round_group_id?.toString() || "",
            athleteCount: existingRound.athlete_count?.toString() || "",
            boulderCount: existingRound.boulder_count?.toString() || "",
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

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

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
      const selectedRoundGroup = roundGroups.find(
        (rg) => rg.id === parseInt(formData.roundGroupId)
      );

      if (!selectedRoundGroup) {
        setErrors({ roundGroupId: "Ógildur umferðarflokkur" });
        return;
      }

      const round = {
        round_group_id: selectedRoundGroup.id,
        name: selectedRoundGroup.name,
        athlete_count: parseInt(formData.athleteCount),
        boulder_count: parseInt(formData.boulderCount),
        _id: existingRound?._id || `round-${Date.now()}-${Math.random()}`,
      };

      // If editing, preserve existing properties
      if (existingRound) {
        round.existingId = existingRound.existingId;
      }

      onSelectRound(round);
    } catch (err) {
      console.error("Error creating round:", err);
      setErrors({ general: "Villa kom upp við að búa til umferð" });
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
                onChange={handleChange("roundGroupId")}
                disabled={isEditMode} // Don't allow changing round type when editing
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
              onChange={handleChange("athleteCount")}
              error={!!errors.athleteCount}
              helperText={errors.athleteCount}
              inputProps={{ min: 1, max: 100 }}
            />

            <TextField
              fullWidth
              label="Fjöldi leiða"
              type="number"
              value={formData.boulderCount}
              onChange={handleChange("boulderCount")}
              error={!!errors.boulderCount}
              helperText={errors.boulderCount}
              inputProps={{ min: 1, max: 20 }}
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
