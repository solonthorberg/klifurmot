// src/pages/JudgeLoginPage.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControl,
  Alert,
  Paper,
  CircularProgress,
  Container,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import { Check as CheckIcon } from "@mui/icons-material";

function JudgeLoginPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linkInfo, setLinkInfo] = useState(null);
  const [isInvitation, setIsInvitation] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Registration form
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    full_name: "",
  });

  useEffect(() => {
    checkToken();
  }, [token]);

  const checkToken = async () => {
    try {
      // First try as invitation
      try {
        const inviteRes = await api.get(
          `/accounts/judge-invitations/validate/${token}/`
        );
        setLinkInfo(inviteRes.data);
        setIsInvitation(true);
        setRegisterData((prev) => ({
          ...prev,
          email: inviteRes.data.invited_email || "",
          full_name: inviteRes.data.invited_name || "",
          username: inviteRes.data.invited_email
            ? inviteRes.data.invited_email.split("@")[0]
            : "",
        }));
        setLoading(false);
        checkAuth();
      } catch (inviteErr) {
        // If not invitation, try as regular link
        const linkRes = await api.get(`/accounts/judge-links/${token}/`);
        setLinkInfo(linkRes.data);
        setIsInvitation(false);
        setLoading(false);
        checkAuth();
      }
    } catch (err) {
      setError("Invalid or expired link");
      setLoading(false);
    }
  };

  const checkAuth = () => {
    const authToken = localStorage.getItem("token");
    if (authToken) {
      setAuthToken(authToken);
      setIsAuthenticated(true);
      if (linkInfo) {
        handleAuthenticated();
      }
    }
  };

  const handleAuthenticated = async () => {
    if (isInvitation) {
      // Claim invitation
      try {
        const res = await api.post(
          `/accounts/judge-invitations/claim/${token}/`
        );
        if (res.data.success) {
          navigate(
            res.data.redirect_to ||
              `/judge/dashboard/${linkInfo.competition_id}`
          );
        }
      } catch (err) {
        if (err.response?.status === 403) {
          setError(err.response.data.detail);
          localStorage.removeItem("token");
          setAuthToken(null);
          setIsAuthenticated(false);
        }
      }
    } else {
      // Regular link - just redirect
      const me = await api.get("accounts/me/");
      if (
        me.data.user.id === linkInfo.user_id ||
        me.data.user.email === linkInfo.user_email
      ) {
        navigate(`/judge/dashboard/${linkInfo.competition_id}`);
      } else {
        setError(
          "This link is for a different user. Please login with the correct account."
        );
        localStorage.removeItem("token");
        setAuthToken(null);
        setIsAuthenticated(false);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      localStorage.removeItem("token");
      setAuthToken(null);

      const res = await api.post("accounts/login/", { email, password });
      const authToken = res.data.token;
      localStorage.setItem("token", authToken);
      setAuthToken(authToken);

      setIsAuthenticated(true);
      await handleAuthenticated();
    } catch (err) {
      setError("Login failed. Please check your credentials.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    if (registerData.password !== registerData.password2) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await api.post("/accounts/register/", registerData);
      const authToken = res.data.token;
      localStorage.setItem("token", authToken);
      setAuthToken(authToken);

      setIsAuthenticated(true);
      await handleAuthenticated();
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    }
  };

  if (loading) {
    return (
      <Container
        maxWidth="sm"
        sx={{ mt: 8, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error && !linkInfo) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          {isInvitation ? "Judge Invitation" : "Judge Login"}
        </Typography>

        {linkInfo && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {isInvitation ? (
              <>
                You've been invited to judge{" "}
                <strong>{linkInfo.competition_title}</strong>
                {linkInfo.invited_email && (
                  <>
                    {" "}
                    for email: <strong>{linkInfo.invited_email}</strong>
                  </>
                )}
              </>
            ) : (
              <>
                Login to judge <strong>{linkInfo.competition_title}</strong>
                <br />
                Required email: <strong>{linkInfo.user_email}</strong>
              </>
            )}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!isAuthenticated ? (
          <Box>
            {isInvitation ? (
              // For invitations, show tabs for login/register
              <>
                <Tabs
                  value={activeTab}
                  onChange={(e, v) => setActiveTab(v)}
                  sx={{ mb: 3 }}
                >
                  <Tab label="Login" />
                  <Tab label="Create Account" />
                </Tabs>

                {activeTab === 0 ? (
                  // Login form
                  <Box component="form" onSubmit={handleLogin}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Already have an account? Login to accept the invitation.
                    </Typography>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      sx={{ mb: 2 }}
                      helperText={
                        linkInfo.invited_email &&
                        `Must match: ${linkInfo.invited_email}`
                      }
                    />
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      sx={{ mb: 3 }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                    >
                      Login & Accept Invitation
                    </Button>
                  </Box>
                ) : (
                  // Register form
                  <Box component="form" onSubmit={handleRegister}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Create a new account to accept the invitation.
                    </Typography>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={registerData.full_name}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          full_name: e.target.value,
                        })
                      }
                      required
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          email: e.target.value,
                        })
                      }
                      required
                      disabled={!!linkInfo.invited_email}
                      sx={{ mb: 2 }}
                      helperText={
                        linkInfo.invited_email && "Email locked to invitation"
                      }
                    />
                    <TextField
                      fullWidth
                      label="Username"
                      value={registerData.username}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          username: e.target.value,
                        })
                      }
                      required
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      }
                      required
                      sx={{ mb: 2 }}
                      helperText="At least 8 characters"
                    />
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type="password"
                      value={registerData.password2}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password2: e.target.value,
                        })
                      }
                      required
                      sx={{ mb: 3 }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                    >
                      Create Account & Accept Invitation
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              // For regular links, just show login
              <Box component="form" onSubmit={handleLogin}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  sx={{ mb: 2 }}
                  helperText={`Must be: ${linkInfo.user_email}`}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                >
                  Login as Judge
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Processing...</Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default JudgeLoginPage;
