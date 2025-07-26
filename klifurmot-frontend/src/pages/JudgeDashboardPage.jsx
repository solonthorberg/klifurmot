import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SelectRound from "../components/SelectRound";
import SelectCategoryAndBoulder from "../components/SelectCategoryAndBoulder";
import JudgeScoring from "../components/JudgeScoring";
import api, { setAuthToken } from "../services/api";
import { useNotification } from "../context/NotificationContext";
import {
  Box,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Container,
} from "@mui/material";

function JudgeDashboardPage() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const { showError } = useNotification();
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

    const checkAccess = async () => {
      try {
        const rolesResponse = await api.get(
          `/competitions/roles/?competition_id=${competitionId}`
        );
        console.log("Roles response:", rolesResponse.data);

        const hasAdminRole = rolesResponse.data.some(
          (role) => role.role === "admin"
        );

        if (hasAdminRole) {
          setAuthorized(true);
          setUserRole("admin");
          setLoading(false);
          return;
        }

        const hasJudgeRole = rolesResponse.data.some(
          (role) => role.role === "judge"
        );

        if (hasJudgeRole) {
          setAuthorized(true);
          setUserRole("judge");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error checking competition roles:", err);
      }

      showError("Þú hefur ekki aðgang að þessu viðmóti");
      navigate("/controlpanel");
      setLoading(false);
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

      <Box sx={{ mb: 4 }}>{renderComponent()}</Box>

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
            Þú hefur aðgang að dómaraviðmóti sem keppnisstjóri.
          </Typography>
        </Alert>
      )}
    </Container>
  );
}

export default JudgeDashboardPage;
