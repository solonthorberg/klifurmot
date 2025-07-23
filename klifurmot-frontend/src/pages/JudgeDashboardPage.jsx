import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SelectRound from "../components/SelectRound";
import SelectCategoryAndBoulder from "../components/SelectCategoryAndBoulder";
import JudgeScoring from "../components/JudgeScoring";
import api, { setAuthToken } from "../services/api";
import {
  Box,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Container,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  AdminPanelSettings as AdminIcon,
  ArrowBack as BackIcon,
  EmojiEvents as CompetitionIcon,
} from "@mui/icons-material";

function JudgeDashboardPage() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [selectedRoundGroupId, setSelectedRoundGroupId] = useState(null);
  const [selectedRoundOrder, setSelectedRoundOrder] = useState(null);
  const [selectedRoundName, setSelectedRoundName] = useState("");
  const [selectedBoulderNumber, setSelectedBoulderNumber] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [currentAthleteIndex, setCurrentAthleteIndex] = useState(0);
  const [step, setStep] = useState("select-round");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    setAuthToken(token);

    // Check access - either via judge link OR as admin
    const checkAccess = async () => {
      try {
        const userResponse = await api.get("accounts/me/");
        const currentUser = userResponse.data;

        // Method 1: Judge link access (existing logic)
        const judgeInfoRaw = localStorage.getItem("judgeInfo");
        if (judgeInfoRaw) {
          try {
            const expectedJudge = JSON.parse(judgeInfoRaw);
            if (
              currentUser.user.id === expectedJudge.user_id &&
              expectedJudge.competition_id === parseInt(competitionId)
            ) {
              setAuthorized(true);
              setUserRole("judge");
              return;
            }
          } catch (err) {
            console.log("Invalid judge info, checking admin access...");
          }
        }

        // Method 2: Admin access - check if user has admin role for this competition
        try {
          const rolesResponse = await api.get(
            `/competitions/roles/?competition_id=${competitionId}`
          );

          const hasAdminRole = rolesResponse.data.some(
            (role) => role.role === "admin"
          );

          if (hasAdminRole) {
            setAuthorized(true);
            setUserRole("admin");
            return;
          }

          // Method 3: Check if user has judge role (without judge link)
          const hasJudgeRole = rolesResponse.data.some(
            (role) => role.role === "judge"
          );

          if (hasJudgeRole) {
            setAuthorized(true);
            setUserRole("judge");
            return;
          }
        } catch (err) {
          console.error("Error checking competition roles:", err);
        }

        // No access found
        console.log("No access found, redirecting...");
        navigate("/");
      } catch (err) {
        console.error("Authorization error:", err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [competitionId, navigate]);

  const handleBack = () => {
    if (step === "select-category-boulder") {
      setStep("select-round");
    } else if (step === "judge-scoring") {
      setStep("select-category-boulder");
    }
  };

  const handleNext = () => {
    setCurrentAthleteIndex((prev) => Math.min(prev + 1, athletes.length - 1));
  };

  const handlePrevious = () => {
    setCurrentAthleteIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleGoToControlPanel = () => {
    navigate("/controlpanel");
  };

  const renderComponent = () => {
    switch (step) {
      case "select-round":
        return (
          <SelectRound
            competitionId={competitionId}
            onContinue={(roundGroupId, roundOrder, roundName) => {
              setSelectedRoundGroupId(roundGroupId);
              setSelectedRoundOrder(roundOrder);
              setSelectedRoundName(roundName);
              setStep("select-category-boulder");
            }}
          />
        );
      case "select-category-boulder":
        return (
          <SelectCategoryAndBoulder
            roundGroupId={selectedRoundGroupId}
            roundOrder={selectedRoundOrder}
            roundName={selectedRoundName}
            competitionId={competitionId}
            onSelectAthlete={(athlete, boulderNumber, fullList) => {
              setSelectedBoulderNumber(boulderNumber);
              setAthletes(fullList);
              const index = fullList.findIndex(
                (a) => a.start_order === athlete.start_order
              );
              setCurrentAthleteIndex(index);
              setStep("judge-scoring");
            }}
            onBack={handleBack}
          />
        );
      case "judge-scoring":
        return (
          <JudgeScoring
            athlete={athletes[currentAthleteIndex]}
            boulderNumber={selectedBoulderNumber}
            roundOrder={selectedRoundOrder}
            competitionId={competitionId}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onBack={handleBack}
          />
        );
      default:
        return (
          <Alert severity="error">
            <Typography>Villa: óþekkt skref.</Typography>
          </Alert>
        );
    }
  };

  if (loading) {
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
          Hleður dómaraviðmót...
        </Typography>
      </Box>
    );
  }

  if (!authorized) return null;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Dómaraviðmót
            </Typography>

            <Chip
              label={userRole === "admin" ? "Keppnisstjóri" : "Dómari"}
              color={userRole === "admin" ? "primary" : "success"}
              variant="outlined"
              size="medium"
            />
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ mb: 4 }}>{renderComponent()}</Box>

      {/* Admin Notice */}
      {userRole === "admin" && (
        <Alert
          severity="info"
          sx={{
            borderRadius: 2,
            "& .MuiAlert-message": {
              width: "100%",
            },
          }}
        >
          <Typography variant="body2">
            <Box component="span" fontWeight="bold">
              Keppnisstjóri aðgangur:
            </Box>{" "}
            Þú hefur aðgang að dómaraviðmóti sem keppnisstjóri. Þú getur skráð
            niðurstöður og framkvæmt allar dómaraðgerðir.
          </Typography>
        </Alert>
      )}
    </Container>
  );
}

export default JudgeDashboardPage;