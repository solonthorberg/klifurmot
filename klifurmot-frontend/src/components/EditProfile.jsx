import { useState, useEffect } from "react";
import api from "../services/api";
import dayjs from "dayjs";
import {
  Box,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Avatar,
  IconButton,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import PersonIcon from "@mui/icons-material/Person";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";
import { compressCompetitionImage } from "../utils/ImageCompression";

function EditProfile({ me, onCancel, onSave }) {
  const [formData, setFormData] = useState({
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
  const [profileImage, setProfileImage] = useState(null); // New image selected
  const [profileImagePreview, setProfileImagePreview] = useState(
    me.profile?.profile_picture || null
  );
  const [deleteImageFlag, setDeleteImageFlag] = useState(false); // Mark deletion

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

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressCompetitionImage(file);
        setProfileImage(compressed.file);
        setProfileImagePreview(URL.createObjectURL(compressed.file));
        setDeleteImageFlag(false); // Reset delete flag
      } catch (error) {
        console.error("Image compression failed:", error);
        setProfileImage(file);
        setProfileImagePreview(URL.createObjectURL(file));
        setDeleteImageFlag(false);
      }
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
    setDeleteImageFlag(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("full_name", formData.full_name);
      formDataToSend.append("gender", formData.gender);
      formDataToSend.append("nationality", formData.nationality);
      formDataToSend.append("height_cm", formData.height_cm);
      formDataToSend.append("wingspan_cm", formData.wingspan_cm);

      if (formData.date_of_birth) {
        formDataToSend.append(
          "date_of_birth",
          formData.date_of_birth.format("YYYY-MM-DD")
        );
      }

      if (deleteImageFlag) {
        formDataToSend.append("profile_picture", "");
      } else if (profileImage) {
        formDataToSend.append("profile_picture", profileImage);
      }
      await api.patch("accounts/me/", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Upplýsingar uppfærðar!");
      onSave();
    } catch (err) {
      setMessage("Villa kom upp við uppfærslu.");
      console.error(err);
    }
  };

  return (
    <Box maxWidth="sm" sx={{ mx: "auto" }}>
      <Typography textAlign="center" variant="h5" gutterBottom>
        Breyta prófíl
      </Typography>
      {message && <p>{message}</p>}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {/* Profile Avatar */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            mt: 2,
          }}
        >
          <Avatar
            src={profileImagePreview || undefined}
            sx={{
              width: 150,
              height: 150,
              bgcolor: "grey.300",
            }}
          >
            {!profileImagePreview && <PersonIcon sx={{ fontSize: 80 }} />}
          </Avatar>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ImageIcon color="action" />
              <Typography variant="body2" noWrap>
                {profileImage
                  ? profileImage.name
                  : me.profile?.profile_picture && !deleteImageFlag
                  ? me.profile.profile_picture.split("/").pop()
                  : "Engin mynd valin"}
              </Typography>
            </Box>
            {(profileImagePreview || profileImage) && (
              <IconButton
                color="error"
                size="small"
                onClick={handleRemoveImage}
                title="Eyða mynd"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>

          <Button
            variant="contained"
            component="label"
            startIcon={<ImageIcon />}
            size="medium"
          >
            Breyta mynd
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleImageChange}
            />
          </Button>
        </Box>

        {/* Other fields */}
        <FormControl fullWidth>
          <TextField
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            variant="outlined"
            label="Fullt nafn"
          />
        </FormControl>

        <FormControl fullWidth>
          <DatePicker
            value={formData.date_of_birth}
            onChange={handleDateChange}
            format="DD/MM/YYYY"
            slotProps={{
              textField: {
                fullWidth: true,
                variant: "outlined",
                label: "Fæðingardagur",
              },
            }}
          />
        </FormControl>

        <FormControl fullWidth required>
          <Select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            variant="outlined"
            displayEmpty
          >
            <MenuItem value="KK">KK</MenuItem>
            <MenuItem value="KVK">KVK</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth required>
          <Select
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
            variant="outlined"
            displayEmpty
          >
            <MenuItem value="" disabled>
              Veldu þjóð
            </MenuItem>
            {countries.map((c) => (
              <MenuItem key={c.country_code} value={c.country_code}>
                {c.name_en}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <TextField
            type="number"
            name="height_cm"
            value={formData.height_cm}
            onChange={handleChange}
            variant="outlined"
            label="Hæð (cm)"
          />
        </FormControl>

        <FormControl fullWidth>
          <TextField
            type="number"
            name="wingspan_cm"
            value={formData.wingspan_cm}
            onChange={handleChange}
            variant="outlined"
            label="Vænghaf (cm)"
          />
        </FormControl>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            marginTop: 2,
            justifyContent: "center",
          }}
        >
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
