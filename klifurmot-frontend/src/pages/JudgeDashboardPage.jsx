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
  const [selectedRoundGroupId, setSelectedRoundGroupId] = useState(null);
  const [selectedRoundOrder, setSelectedRoundOrder] = useState(null);
  const [selectedBoulderNumber, setSelectedBoulderNumber] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [currentAthleteIndex, setCurrentAthleteIndex] = useState(0);
  const [step, setStep] = useState("select-round");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const judgeInfoRaw = localStorage.getItem("judgeInfo");

    if (!token || !judgeInfoRaw) {
      navigate("/");
      return;
    }

    setAuthToken(token);

    let expectedJudge;
    try {
      expectedJudge = JSON.parse(judgeInfoRaw);
    } catch (err) {
      navigate("/");
      return;
    }

    api.get("accounts/me/")
      .then((res) => {
        if (
          res.data.user.id === expectedJudge.user_id &&
          expectedJudge.competition_id === parseInt(competitionId)
        ) {
          setAuthorized(true);
        } else {
          navigate("/");
        }
      })
      .catch(() => {
        navigate("/");
      })
      .finally(() => {
        setLoading(false);
      });
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
            onContinue={(roundGroupId, roundOrder) => {
              setSelectedRoundGroupId(roundGroupId);
              setSelectedRoundOrder(roundOrder);
              setStep("select-category-boulder");
            }}
          />
        );
      case "select-category-boulder":
        return (
          <SelectCategoryAndBoulder
            roundGroupId={selectedRoundGroupId}
            roundOrder={selectedRoundOrder}
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
    <div>
      <h2>Dómaraviðmót</h2>
      {renderComponent()}
    </div>
  );
}

export default JudgeDashboardPage;
