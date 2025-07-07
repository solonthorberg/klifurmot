import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SelectRound from "../components/SelectRound";
import SelectCategoryAndBoulder from "../components/SelectCategoryAndBoulder";
import JudgeScoring from "../components/JudgeScoring";
import api, { setAuthToken } from "../services/api";

function JudgeDashboardPage() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
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
          />
        );
      default:
        return <p>Villa: óþekkt skref.</p>;
    }
  };

  if (loading) return <p>Hleður...</p>;
  if (!authorized) return null;

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <h2 className="mb-0">Dómaraviðmót</h2>
          {userRole === "admin" && (
            <span className="badge bg-primary ms-2">Admin</span>
          )}
          {userRole === "judge" && (
            <span className="badge bg-success ms-2">Dómari</span>
          )}
        </div>

        {userRole === "admin" && (
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={handleGoToControlPanel}
            >
              ← Til baka í stjórnborð
            </button>
          </div>
        )}
      </div>

      {renderComponent()}

      {userRole === "admin" && (
        <div className="alert alert-info mt-4">
          <strong>Admin aðgangur:</strong> Þú hefur aðgang að dómaraviðmóti sem
          keppnisstjóri. Þú getur skráð niðurstöður og framkvæmt allar
          dómaraðgerðir.
        </div>
      )}
    </div>
  );
}

export default JudgeDashboardPage;
