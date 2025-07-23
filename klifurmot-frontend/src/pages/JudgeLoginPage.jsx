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
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { Login as LoginIcon, Check as CheckIcon } from "@mui/icons-material";

function JudgeLoginPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [judgeInfo, setJudgeInfo] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [judgeEmail, setJudgeEmail] = useState("");
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    api
      .get(`/accounts/judge-links/${token}/`)
      .then((res) => {
        setJudgeInfo(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Slóðin er ógild eða útrunnin.");
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    const localToken = localStorage.getItem("token");
    if (localToken) {
      setAuthToken(localToken);
      api
        .get("accounts/me/")
        .then((res) => {
          setLoggedInUserId(res.data.user.id);
          setJudgeEmail(res.data.user.email);
          setIsAuthenticated(true);
        })
        .catch(() => {
          setIsAuthenticated(false);
          localStorage.removeItem("token");
          setAuthToken(null);
        })
        .finally(() => {
          setCheckingAuth(false);
        });
    } else {
      setCheckingAuth(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      localStorage.removeItem("token");
      setAuthToken(null);

      const res = await api.post("accounts/login/", { email, password });
      const authToken = res.data.token;
      localStorage.setItem("token", authToken);
      setAuthToken(authToken);

      const me = await api.get("accounts/me/");
      setLoggedInUserId(me.data.user.id);
      setJudgeEmail(me.data.user.email);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      setError("Innskráning mistókst. Athugaðu netfang og lykilorð.");
      setIsAuthenticated(false);
    }
  };

  const handleAccept = () => {
    localStorage.setItem("judgeInfo", JSON.stringify(judgeInfo));
    navigate(`/judge/competition/${judgeInfo?.competition_id}/judge-dashboard`);
  };

  if (loading || checkingAuth) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="h6" color="text.secondary">
          Hleður...
        </Typography>
      </Box>
    );
  }

  if (error && !isAuthenticated) {
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
            maxWidth: 500,
            width: "100%",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Dómarainnköllun
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Þú hefur verið boðin(n) sem dómari á "
              {judgeInfo?.competition_title || "óþekkt mót"}"
            </Typography>
          </Box>

          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>

          {renderLoginForm()}
        </Paper>
      </Box>
    );
  }

  const isCorrectJudge =
    isAuthenticated && judgeInfo && loggedInUserId === judgeInfo.user_id;

  function renderLoginForm() {
    return (
      <Box>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ textAlign: "center", mb: 3 }}
        >
          Skráðu þig inn til að halda áfram
        </Typography>

        <Box
          component="form"
          onSubmit={handleLogin}
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
      </Box>
    );
  }

  if (!isCorrectJudge) {
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
            maxWidth: 500,
            width: "100%",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Dómarainnköllun
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Þú hefur verið boðin(n) sem dómari á{" "}
              {judgeInfo?.competition_title || "óþekkt mót"}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {renderLoginForm()}
        </Paper>
      </Box>
    );
  }

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
          maxWidth: 500,
          width: "100%",
        }}
      >
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <CheckIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Velkomin(n) dómari!
          </Typography>
          <Typography>
            Þú hefur verið boðinn sem dómari á{" "}
            {judgeInfo?.competition_title || "óþekkt mót"}
          </Typography>
        </Box>

        <Button
          onClick={handleAccept}
          variant="contained"
          size="large"
          fullWidth
        >
          Samþykkja
        </Button>
      </Paper>
    </Box>
  );
}

export default JudgeLoginPage;
