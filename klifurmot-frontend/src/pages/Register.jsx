import { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate, Link } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControl,
  Alert,
  Paper,
  Select,
  MenuItem
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    password2: '',
    gender: '',
    date_of_birth: null,
    nationality: '',
    height_cm: '',
    wingspan_cm: '',
  });

  const [countries, setCountries] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await api.get('accounts/countries/');
        setCountries(response.data);
        const iceland = response.data.find(c => c.name_en === 'Iceland');
        if (iceland) {
          setFormData(prev => ({ ...prev, nationality: iceland.country_code }));
        }
      } catch (err) {
        console.error('Failed to load countries:', err);
      }
    };
    fetchCountries();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (newValue) => {
    setFormData(prev => ({
      ...prev,
      date_of_birth: newValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.full_name.trim()) {
      setError('Fullt nafn er nauðsynlegt.');
      return;
    }

    if (formData.password !== formData.password2) {
      setError('Lykilorð passa ekki saman.');
      return;
    }

    try {
      const submitData = {
        ...formData,
        date_of_birth: formData.date_of_birth
          ? formData.date_of_birth.format("YYYY-MM-DD")
          : '',
      };

      await api.post('accounts/register/', submitData);
      setSuccess('Skráning tókst! Vinsamlegast skráðu þig inn.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        (typeof err.response?.data === 'object' 
          ? 'Skráning mistókst. Athugaðu upplýsingarnar.' 
          : err.response?.data) ||
        'Skráning mistókst.';
      console.error('Registration failed:', err.response?.data);
      setError(msg);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
        padding: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          maxWidth: 600,
          width: "100%",
        }}
      >
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Nýskráning
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <FormControl fullWidth>
            <TextField
              label="Notendanafn"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              variant="outlined"
            />
          </FormControl>

          <FormControl fullWidth>
            <TextField
              label="Fullt nafn"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              variant="outlined"
            />
          </FormControl>

          <FormControl fullWidth>
            <TextField
              type="email"
              label="Netfang"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              variant="outlined"
            />
          </FormControl>

          <FormControl fullWidth>
            <TextField
              type="password"
              label="Lykilorð"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              variant="outlined"
            />
          </FormControl>

          <FormControl fullWidth>
            <TextField
              type="password"
              label="Staðfesta lykilorð"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              required
              variant="outlined"
            />
          </FormControl>

          <FormControl fullWidth required>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Kyn
            </Typography>
            <Select 
              name="gender" 
              value={formData.gender} 
              onChange={handleChange}
              variant="outlined"
            >
              <MenuItem value="">Veldu kyn</MenuItem>
              <MenuItem value="KK">KK</MenuItem>
              <MenuItem value="KVK">KVK</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Fæðingardagur
            </Typography>
            <DatePicker
              value={formData.date_of_birth}
              onChange={handleDateChange}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: "outlined",
                  required: true,
                },
              }}
            />
          </FormControl>

          <FormControl fullWidth required>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Þjóðerni
            </Typography>
            <Select
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              variant="outlined"
            >
              <MenuItem value="">Veldu þjóð</MenuItem>
              {countries.map((country) => (
                <MenuItem key={country.country_code} value={country.country_code}>
                  {country.name_en}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <TextField
              type="number"
              label="Hæð (cm)"
              name="height_cm"
              value={formData.height_cm}
              onChange={handleChange}
              variant="outlined"
              inputProps={{ min: 0, max: 300 }}
            />
          </FormControl>

          <FormControl fullWidth>
            <TextField
              type="number"
              label="Vænghaf (cm)"
              name="wingspan_cm"
              value={formData.wingspan_cm}
              onChange={handleChange}
              variant="outlined"
              inputProps={{ min: 0, max: 300 }}
            />
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            sx={{ mt: 3 }}
          >
            Skrá Aðgang
          </Button>
        </Box>

        <Typography variant="body2" align="center" color="textSecondary" sx={{ mt: 3 }}>
          Ertu nú þegar með aðgang?{" "}
          <Link
            to="/login"
            style={{
              color: "#1976d2",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Skrá inn
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default Register;