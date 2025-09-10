import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { GoogleLogin } from "@react-oauth/google";
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControl,
  Alert,
  Paper,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import { MobileDatePicker } from "@mui/x-date-pickers";
import { Check as CheckIcon } from "@mui/icons-material";

function JudgeLoginPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [linkInfo, setLinkInfo] = useState(null);
  const [isInvitation, setIsInvitation] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showNotification } = useNotification();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    password2: "",
    gender: "",
    date_of_birth: null,
    nationality: "",
    height_cm: "",
    wingspan_cm: "",
  });

  const [countries, setCountries] = useState([]);

  // Initialize page - validate token and check auth
  useEffect(() => {
    initializePage();
  }, [token]);

  // Auto-redirect when both linkInfo and auth are ready
  useEffect(() => {
    if (linkInfo && isAuthenticated) {
      redirectToJudgeDashboard();
    }
  }, [linkInfo, isAuthenticated]);

  const initializePage = async () => {
    try {
      await checkToken();
      checkAuth();
      await fetchCountries();
    } catch (err) {
      setError("Ógild eða útrunnin slóð");
    } finally {
      setLoading(false);
    }
  };

  const checkToken = async () => {
    try {
      // Try as invitation first
      const inviteRes = await api.get(
        `/accounts/judge-invitations/validate/${token}/`
      );
      setLinkInfo(inviteRes.data);
      setIsInvitation(true);
      setFormData((prev) => ({
        ...prev,
        email: inviteRes.data.invited_email || "",
      }));
    } catch (inviteErr) {
      // Try as regular judge link
      const linkRes = await api.get(`/accounts/judge-links/${token}/`);
      setLinkInfo(linkRes.data);
      setIsInvitation(false);
    }
  };

  const checkAuth = () => {
    const authToken = localStorage.getItem("token");
    if (authToken) {
      setAuthToken(authToken);
      setIsAuthenticated(true);
    }
  };

  const redirectToJudgeDashboard = async () => {
    try {
      if (isInvitation) {
        // Claim the invitation
        const res = await api.post(
          `/accounts/judge-invitations/claim/${token}/`
        );
        if (res.data.success) {
          navigate(
            `/judge/competition/${linkInfo.competition_id}/judge-dashboard`
          );
        }
      } else {
        // Verify user has access to this link
        const me = await api.get("accounts/me/");
        if (
          me.data.user.id === linkInfo.user_id ||
          me.data.user.email === linkInfo.user_email
        ) {
          navigate(
            `/judge/competition/${linkInfo.competition_id}/judge-dashboard`
          );
        } else {
          throw new Error(
            "This link is for a different user. Please login with the correct account."
          );
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to access judge dashboard"
      );
      setIsAuthenticated(false);
      localStorage.removeItem("token");
      setAuthToken(null);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await api.get("accounts/countries/");
      setCountries(response.data);
      const iceland = response.data.find((c) => c.name_en === "Iceland");
      if (iceland) {
        setFormData((prev) => ({
          ...prev,
          nationality: iceland.country_code,
        }));
      }
    } catch (err) {
      console.error("Failed to load countries:", err);
    }
  };

  const handleLogin = async () => {
    if (isLoading || !email || !password) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await api.post("accounts/login/", { email, password });
      const { token } = res.data;
      login(token);
      setIsAuthenticated(true);
      // Redirect will happen automatically via useEffect
    } catch (err) {
      const errorMessage =
        "Innskráning mistókst. Athugaðu netfang og lykilorð.";
      setError(errorMessage);
      showNotification(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.full_name.trim()) {
      const errorMessage = "Fullt nafn er nauðsynlegt.";
      setError(errorMessage);
      showNotification(errorMessage, "error");
      return;
    }

    if (formData.password !== formData.password2) {
      const errorMessage = "Lykilorð passa ekki saman.";
      setError(errorMessage);
      showNotification(errorMessage, "error");
      return;
    }

    try {
      const submitData = {
        ...formData,
        date_of_birth: formData.date_of_birth
          ? formData.date_of_birth.format("YYYY-MM-DD")
          : "",
      };

      const res = await api.post("accounts/register/", submitData);
      const authToken = res.data.token;
      login(authToken);
      setIsAuthenticated(true);
      setSuccess("Nýskráning tókst!");
      showNotification("Nýskráning tókst!", "success");
      // Redirect will happen automatically via useEffect
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        (typeof err.response?.data === "object"
          ? "Skráning mistókst. Athugaðu upplýsingarnar þínar."
          : err.response?.data) ||
        "Skráning mistókst.";
      setError(msg);
      showNotification(msg, "error");
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    setError("");
    try {
      const res = await api.post("accounts/google-login/", { token: idToken });
      const { token } = res.data;
      login(token);
      setIsAuthenticated(true);
      // Redirect will happen automatically via useEffect
    } catch (err) {
      const errorMessage = "Google innskráning mistókst";
      setError(errorMessage);
      showNotification(errorMessage, "error");
    }
  };

  const handleGoogleSignup = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    setError("");
    try {
      const res = await api.post("accounts/google-login/", { token: idToken });
      const { token } = res.data;
      login(token);
      setIsAuthenticated(true);
      showNotification("Nýskráning með Google tókst!", "success");
      // Redirect will happen automatically via useEffect
    } catch (err) {
      const errorMessage = "Google nýskráning mistókst";
      setError(errorMessage);
      showNotification(errorMessage, "error");
    }
  };

  if (loading) {
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
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={48} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            Hleður dómaraviðmót...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error && !linkInfo) {
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
            textAlign: "center",
          }}
        >
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography variant="body1" color="text.secondary">
            Vinsamlegast athugaðu slóðina og reyndu aftur.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Show processing state when authenticated
  if (isAuthenticated && linkInfo) {
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
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
          }}
        >
          <CheckIcon sx={{ fontSize: 60, color: "success.main", mb: 2 }} />
          <Typography variant="h6">Unnið úr beiðni...</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Beint þér á dómaraviðmót...
          </Typography>
        </Paper>
      </Box>
    );
  }

  const maxWidth = isInvitation ? 600 : 400;
  const minHeight = isInvitation ? "80vh" : "60vh";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: minHeight,
        padding: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          maxWidth: maxWidth,
          width: "100%",
        }}
      >
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          {isInvitation ? "Dómaraboð" : "Dómarainnskráning"}
        </Typography>

        {linkInfo && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {isInvitation ? (
              <>
                Þú hefur verið boðaður sem dómari í{" "}
                <strong>{linkInfo.competition_title}</strong>
                {linkInfo.invited_email && (
                  <>
                    {" "}
                    fyrir netfang: <strong>{linkInfo.invited_email}</strong>
                  </>
                )}
              </>
            ) : (
              <>
                Skráðu þig inn til að dæma{" "}
                <strong>{linkInfo.competition_title}</strong>
                <br />
                Nauðsynlegt netfang: <strong>{linkInfo.user_email}</strong>
              </>
            )}
          </Alert>
        )}

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

        {!isAuthenticated ? (
          <Box>
            {isInvitation ? (
              <>
                <Tabs
                  value={activeTab}
                  onChange={(e, v) => setActiveTab(v)}
                  sx={{ mb: 3 }}
                  centered
                >
                  <Tab label="Innskrá" />
                  <Tab label="Búa til aðgang" />
                </Tabs>

                {activeTab === 0 ? (
                  <Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "center", mb: 3 }}
                    >
                      <GoogleLogin
                        onSuccess={handleGoogleLogin}
                        onError={() => {
                          const errorMessage = "Google login mistókst";
                          setError(errorMessage);
                          showNotification(errorMessage, "error");
                        }}
                        size="large"
                        width="100%"
                      />
                    </Box>

                    <Divider sx={{ my: 3 }}>
                      <Typography variant="body2" color="textSecondary">
                        eða
                      </Typography>
                    </Divider>

                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      <FormControl fullWidth>
                        <TextField
                          type="email"
                          label="Netfang"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          variant="outlined"
                          fullWidth
                          disabled={isLoading}
                        />
                      </FormControl>

                      <FormControl fullWidth>
                        <TextField
                          type="password"
                          label="Lykilorð"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          variant="outlined"
                          fullWidth
                          disabled={isLoading}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleLogin();
                            }
                          }}
                        />
                      </FormControl>

                      <Button
                        onClick={handleLogin}
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={isLoading || !email || !password}
                        sx={{ mt: 1 }}
                      >
                        {isLoading ? "Innskrái..." : "Innskrá og taka við boði"}
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "center", mb: 3 }}
                    >
                      <GoogleLogin
                        onSuccess={handleGoogleSignup}
                        onError={() => {
                          const errorMessage = "Google nýskráning mistókst";
                          setError(errorMessage);
                          showNotification(errorMessage, "error");
                        }}
                        size="large"
                        width="100%"
                        text="signup_with"
                      />
                    </Box>

                    <Divider sx={{ my: 3 }}>
                      <Typography variant="body2" color="textSecondary">
                        eða
                      </Typography>
                    </Divider>

                    <Box
                      component="form"
                      onSubmit={handleRegister}
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
                          label="Netfang"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          variant="outlined"
                          disabled={!!linkInfo.invited_email}
                          helperText={
                            linkInfo.invited_email && "Netfang fest við boð"
                          }
                        />
                      </FormControl>

                      <FormControl fullWidth>
                        <TextField
                          label="Lykilorð"
                          name="password"
                          type="password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          variant="outlined"
                          helperText="Að minnsta kosti 8 stafir"
                        />
                      </FormControl>

                      <FormControl fullWidth>
                        <TextField
                          label="Staðfesta lykilorð"
                          name="password2"
                          type="password"
                          value={formData.password2}
                          onChange={handleChange}
                          required
                          variant="outlined"
                        />
                      </FormControl>

                      <FormControl fullWidth>
                        <InputLabel>Kyn</InputLabel>
                        <Select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          label="Kyn"
                        >
                          <MenuItem value="KK">KK</MenuItem>
                          <MenuItem value="KVK">KVK</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth>
                        <MobileDatePicker
                          label="Fæðingardagur"
                          value={formData.date_of_birth}
                          onChange={handleDateChange}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              variant: "outlined",
                            },
                          }}
                        />
                      </FormControl>

                      <FormControl fullWidth>
                        <InputLabel>Þjóðerni</InputLabel>
                        <Select
                          name="nationality"
                          value={formData.nationality}
                          onChange={handleChange}
                          label="Þjóðerni"
                        >
                          {countries.map((country) => (
                            <MenuItem
                              key={country.country_code}
                              value={country.country_code}
                            >
                              {country.name_en}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Typography
                        variant="body1"
                        sx={{
                          textAlign: "center",
                          fontWeight: "medium",
                          color: "text.secondary",
                        }}
                      >
                        Valfrjálsar upplýsingar:
                      </Typography>

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
                        Skrá Aðgang og Taka Við Boði
                      </Button>
                    </Box>
                  </Box>
                )}
              </>
            ) : (
              <Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Skráðu þig inn með réttum netfangi til að fá aðgang að
                  dómaraviðmóti.
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                  <GoogleLogin
                    onSuccess={handleGoogleLogin}
                    onError={() => {
                      const errorMessage = "Google login mistókst";
                      setError(errorMessage);
                      showNotification(errorMessage, "error");
                    }}
                    size="large"
                    width="100%"
                  />
                </Box>

                <Divider sx={{ my: 3 }}>
                  <Typography variant="body2" color="textSecondary">
                    eða
                  </Typography>
                </Divider>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <FormControl fullWidth>
                    <TextField
                      type="email"
                      label="Netfang"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      variant="outlined"
                      fullWidth
                      disabled={isLoading}
                      helperText={`Verður að vera: ${linkInfo.user_email}`}
                    />
                  </FormControl>

                  <FormControl fullWidth>
                    <TextField
                      type="password"
                      label="Lykilorð"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      variant="outlined"
                      fullWidth
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleLogin();
                        }
                      }}
                    />
                  </FormControl>

                  <Button
                    onClick={handleLogin}
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={isLoading || !email || !password}
                    sx={{ mt: 1 }}
                  >
                    {isLoading ? "Innskrái..." : "Innskrá sem dómari"}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        ) : null}

        {!isAuthenticated && (
          <Typography
            variant="body2"
            align="center"
            color="textSecondary"
            sx={{ mt: 3 }}
          >
            Vandamál með aðgang?{" "}
            <Typography
              component="span"
              variant="body2"
              sx={{
                color: "#1976d2",
                fontWeight: "bold",
              }}
            >
              Hafðu samband við keppnisstjóra
            </Typography>
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

export default JudgeLoginPage;
