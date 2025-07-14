import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { GoogleLogin } from "@react-oauth/google";
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControl,
  Alert,
  Paper,
  Divider
} from "@mui/material";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("accounts/login/", { email, password });
      const { token } = res.data;
      login(token);
      navigate("/profile");
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setError("Innskráning mistókst. Athugaðu netfang og lykilorð.");
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    setError("");
    try {
      const res = await api.post("accounts/google-login/", { token: idToken });
      const { token } = res.data;
      login(token);
      navigate("/profile");
    } catch (err) {
      console.error("Google login error:", err.response?.data || err.message);
      setError("Google innskráning mistókst");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        padding: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          maxWidth: 400,
          width: "100%",
        }}
      >
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Innskráning
        </Typography>

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
              type="email"
              label="Netfang"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              variant="outlined"
              fullWidth
            />
          </FormControl>

          <FormControl fullWidth>
            <TextField
              type="password"
              label="Lykilorð"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              variant="outlined"
              fullWidth
            />
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            sx={{ mt: 1 }}
          >
            Innskrá
          </Button>
        </Box>

        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="textSecondary">
            eða
          </Typography>
        </Divider>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => setError("Google login mistókst")}
            size="large"
            width="100%"
          />
        </Box>

        <Typography variant="body2" align="center" color="textSecondary">
          Ertu ekki með aðgang?{" "}
          <Link
            to="/register"
            style={{
              color: "#1976d2",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Nýskrá
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default Login;