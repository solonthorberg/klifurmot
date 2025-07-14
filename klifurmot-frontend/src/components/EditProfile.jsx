import React, { useState, useEffect } from "react";
import api from "../services/api";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Box from "@mui/material/Box";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

function EditProfile({ me, onCancel, onSave }) {
  const [formData, setFormData] = useState({
    email: me.user.email || "",
    full_name: me.profile?.full_name || "",
    gender: me.profile?.gender || "",
    nationality: me.profile?.nationality || "",
    height_cm: me.profile?.height_cm || "",
    wingspan_cm: me.profile?.wingspan_cm || "",
    date_of_birth: me.profile?.date_of_birth
      ? dayjs(me.profile.date_of_birth)
      : null,
  });

  const [countries, setCountries] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("accounts/countries/")
      .then((res) => setCountries(res.data))
      .catch((err) => console.error("Error loading countries:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (newValue) => {
    setFormData((prev) => ({
      ...prev,
      date_of_birth: newValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        date_of_birth: formData.date_of_birth
          ? formData.date_of_birth.format("YYYY-MM-DD")
          : null,
      };

      await api.patch("accounts/me/", submitData);
      setMessage("Upplýsingar uppfærðar!");
      onSave();
    } catch (err) {
      setMessage("Villa kom upp við uppfærslu.");
      console.error(err);
    }
  };

  return (
    <Box>
      <h2>Breyta prófíl</h2>
      {message && <p>{message}</p>}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <FormControl fullWidth>
          <label>Fullt nafn</label>
          <TextField
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            variant="outlined"
          />
        </FormControl>

        <FormControl fullWidth>
          <label>Netfang</label>
          <TextField
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            variant="outlined"
          />
        </FormControl>

        <FormControl fullWidth>
          <label>Fæðingardagur</label>
          <DatePicker
            value={formData.date_of_birth}
            onChange={handleDateChange}
            format="DD/MM/YYYY"
            slotProps={{
              textField: {
                fullWidth: true,
                variant: "outlined",
              },
            }}
          />
        </FormControl>

        <FormControl fullWidth required>
          <label>Kyn</label>
          <Select name="gender" value={formData.gender} onChange={handleChange}>
            <MenuItem value="">Veldu kyn</MenuItem>
            <MenuItem value="KK">KK</MenuItem>
            <MenuItem value="KVK">KVK</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth required>
          <label>Þjóðerni</label>
          <Select
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
          >
            <MenuItem value="">Veldu</MenuItem>
            {countries.map((c) => (
              <MenuItem key={c.country_code} value={c.country_code}>
                {c.name_en}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <label>Hæð (cm)</label>
          <TextField
            type="number"
            name="height_cm"
            value={formData.height_cm}
            onChange={handleChange}
            variant="outlined"
          />
        </FormControl>

        <FormControl fullWidth>
          <label>Vænghaf (cm)</label>
          <TextField
            type="number"
            name="wingspan_cm"
            value={formData.wingspan_cm}
            onChange={handleChange}
            variant="outlined"
          />
        </FormControl>

        <Box sx={{ display: "flex", gap: 2, marginTop: 2 }}>
          <Button variant="contained" type="submit">
            Vista
          </Button>
          <Button variant="outlined" onClick={onCancel}>
            Hætta við
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default EditProfile;
