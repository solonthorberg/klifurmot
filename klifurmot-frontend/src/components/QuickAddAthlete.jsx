import React, { useState } from "react";
import {
  Card,
  Typography,
  CardHeader,
  Box,
  CardContent,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { PersonAdd as PersonAddIcon } from "@mui/icons-material";
import api from "../services/api";

function QuickAddAthlete({ onAthleteCreated, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Nafn er nauðsynlegt");
      return false;
    }
    if (!formData.age || formData.age < 1 || formData.age > 100) {
      setError("Aldur verður að vera á milli 1 og 100");
      return false;
    }
    if (!formData.gender) {
      setError("Kyn verður að vera valið");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/athletes/create-simple-athlete/", {
        name: formData.name.trim(),
        age: parseInt(formData.age),
        gender: formData.gender,
      });

      const data = response.data;

      setSuccess(data.detail || "Keppandi búinn til");
      setFormData({ name: "", age: "", gender: "" });

      if (onAthleteCreated) {
        onAthleteCreated({
          id: data.climber_id,
          name: data.name,
          age: data.age,
          gender: data.gender,
        });
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      console.error("Error creating athlete:", err);
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Villa kom upp við að búa til keppanda";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ name: "", age: "", gender: "" });
    setError("");
    setSuccess("");
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonAddIcon />
            <Typography variant="h6" fontWeight="bold">
              Búa til keppanda
            </Typography>
          </Box>
        }
      />
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mb: 3 }}>
            <FormControl fullWidth>
              <TextField
                label="Nafn"
                variant="outlined"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
                disabled={loading}
                error={error && !formData.name.trim()}
              />
            </FormControl>

            <FormControl fullWidth>
              <TextField
                label="Aldur"
                variant="outlined"
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                required
                disabled={loading}
                inputProps={{ min: 1, max: 100 }}
                error={
                  error &&
                  (!formData.age || formData.age < 1 || formData.age > 100)
                }
              />
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="gender-label">Kyn</InputLabel>
              <Select
                labelId="gender-label"
                value={formData.gender}
                onChange={(e) => handleInputChange("gender", e.target.value)}
                label="Kyn"
                required
                disabled={loading}
                error={error && !formData.gender}
              >
                <MenuItem value="KK">KK</MenuItem>
                <MenuItem value="KVK">KVK</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={handleReset} disabled={loading}>
              Hreinsa
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={20} /> : <PersonAddIcon />
              }
            >
              {loading ? "Býr til..." : "Búa til keppanda"}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
}

export default QuickAddAthlete;
