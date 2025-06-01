import { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";

function JudgeScoring({ athlete, boulderNumber, roundOrder, competitionId, onNext, onPrevious }) {
  const [score, setScore] = useState({
    zoneAttempts: 0,
    topAttempts: 0,
    gotZone: false,
    gotTop: false,
  });

  const [editMode, setEditMode] = useState(false);
  const [tempScore, setTempScore] = useState(score);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);

    const fetchScore = async () => {
      try {
        const res = await api.get(`/scoring/climbs/`, {
          params: {
            round_order: roundOrder,
            boulder_number: boulderNumber,
            competition_id: competitionId,
            climber_id: athlete.climber_id,
            category_id: athlete.category_id
          }
        });
        const current = res.data.find(item => item.climber === athlete.climber_id);
        if (current) {
          setScore({
            zoneAttempts: current.attempts_zone || 0,
            topAttempts: current.attempts_top || 0,
            gotZone: current.zone_reached || false,
            gotTop: current.top_reached || false,
          });
        } else {
          setScore({
            zoneAttempts: 0,
            topAttempts: 0,
            gotZone: false,
            gotTop: false,
          });
        }
      } catch (err) {
        console.error("Failed to fetch current score", err);
      }
    };

    fetchScore();
  }, [athlete, boulderNumber, roundOrder, competitionId]);

  const updateBackend = async (newScore) => {
    const payload = {
      climber: athlete.climber_id,
      boulder: athlete.boulder_id,
      competition: competitionId,
      attempts_zone: newScore.zoneAttempts,
      attempts_top: newScore.topAttempts,
      zone_reached: newScore.gotZone,
      top_reached: newScore.gotTop,
    };

    console.log("Posting to backend with payload:", payload); // 👈 Added log

    try {
      await api.post(`/scoring/climbs/record_attempt/`, payload);
    } catch (err) {
      console.error("Failed to update score", err);
    }
  };

  const handleScore = (type) => {
    if (editMode || score.gotTop) return;

    const newScore = { ...score };

    if (type === "attempt") {
      if (score.gotZone) {
        newScore.topAttempts += 1;
      } else {
      newScore.zoneAttempts += 1;
      newScore.topAttempts += 1;
      }
    }

    else if (type === "zone") {
      if (score.gotZone) {
        newScore.topAttempts += 1;
      } else {
        newScore.zoneAttempts += 1;
        newScore.topAttempts += 1;
        newScore.gotZone = true;
      }
    }

    else if (type === "top") {
      newScore.topAttempts += 1;
      newScore.gotTop = true;

      if (!score.gotZone) {
        newScore.zoneAttempts += 1;
        newScore.gotZone = true;
      }
    }

    setScore(newScore);
    updateBackend(newScore);
  };


  const handleEditChange = (field, delta) => {
    setTempScore(prev => {
      let newZone = prev.zoneAttempts;
      let newTop = prev.topAttempts;

      if (field === "zoneAttempts") {
        newZone = Math.max(0, newZone + delta);
        if (newZone > newTop) newZone = newTop;
      }

      if (field === "topAttempts") {
        newTop = Math.max(0, newTop + delta);
        if (newZone > newTop) newZone = newTop;
      }

      const updated = {
        ...prev,
        zoneAttempts: newZone,
        topAttempts: newTop,
        gotZone: prev.gotZone && newZone > 0,
        gotTop: prev.gotTop && newTop > 0
      };

      if (updated.gotZone && updated.zoneAttempts === 0) updated.zoneAttempts = 1;
      if (updated.gotTop && updated.topAttempts === 0) updated.topAttempts = 1;

      return updated;
    });
  };


  const toggleBooleanField = (field) => {
    setTempScore(prev => {
      const updated = { ...prev };

      if (field === "gotZone") {
        if (!prev.gotZone) {
          updated.gotZone = true;
          if (updated.zoneAttempts < 1) updated.zoneAttempts = 1;
        } else if (!prev.gotTop) {
          updated.gotZone = false;
        }
      } else if (field === "gotTop") {
        if (!prev.gotTop) {
          updated.gotTop = true;
          if (!updated.gotZone) updated.gotZone = true;
          if (updated.zoneAttempts < 1) updated.zoneAttempts = 1;
          if (updated.topAttempts < 1) updated.topAttempts = 1;
        } else {
          updated.gotTop = false;
        }
      }

      return updated;
    });
  };

  const handleEditConfirm = () => {
    setScore(tempScore);
    updateBackend(tempScore);
    setEditMode(false);
  };

  const getStatusBox = (label, active) => (
    <div style={{
      padding: '4px 8px',
      margin: '0.5rem',
      borderRadius: '4px',
      backgroundColor: active ? 'green' : 'red',
      color: 'white',
      fontWeight: 'bold'
    }}>{label}</div>
  );

  return (
    <div className="judge-scoring">
      <h3>({athlete.start_order}) {athlete.climber}</h3>

      <div className="boulder-box">
        <h4>
          Leið {boulderNumber} <button onClick={() => { setTempScore(score); setEditMode(true); }}>✎</button>
        </h4>
        <div className="score-columns">
          <div>
            <p>Tilraunir Zone</p>
            <div className="score-display">{score.zoneAttempts}</div>
            {getStatusBox("Zone", score.gotZone)}
          </div>
          <div>
            <p>Tilraunir Topp</p>
            <div className="score-display">{score.topAttempts}</div>
            {getStatusBox("Toppur", score.gotTop)}
          </div>
        </div>
      </div>

      <div className="actions">
        <button onClick={() => handleScore("top")} disabled={editMode || score.gotTop}>Toppur</button>
        <button onClick={() => handleScore("zone")} disabled={editMode || score.gotTop}>Zone</button>
        <button onClick={() => handleScore("attempt")} disabled={editMode || score.gotTop}>Tilraun</button>
      </div>

      <div className="nav-buttons">
        <button onClick={onPrevious} disabled={editMode}>Fyrri</button>
        <button onClick={onNext} disabled={editMode}>Næsti</button>
      </div>

      {editMode && (
        <div className="edit-popup">
          <div className="score-columns">
            <div>
              <p>Tilraunir Zone</p>
              <button onClick={() => handleEditChange("zoneAttempts", 1)}>▲</button>
              <div className="score-display">{tempScore.zoneAttempts}</div>
              <button onClick={() => handleEditChange("zoneAttempts", -1)}>▼</button>
              <p>
                Zone náð:{" "}
                <input
                  type="checkbox"
                  checked={tempScore.gotZone}
                  onChange={() => toggleBooleanField("gotZone")}
                  disabled={tempScore.gotTop}
                />
              </p>
            </div>
            <div>
              <p>Tilraunir Topp</p>
              <button onClick={() => handleEditChange("topAttempts", 1)}>▲</button>
              <div className="score-display">{tempScore.topAttempts}</div>
              <button onClick={() => handleEditChange("topAttempts", -1)}>▼</button>
              <p>
                Topp náð:{" "}
                <input
                  type="checkbox"
                  checked={tempScore.gotTop}
                  onChange={() => toggleBooleanField("gotTop")}
                />
              </p>
            </div>
          </div>
          <div className="edit-buttons">
            <button onClick={() => setEditMode(false)}>Hætta</button>
            <button onClick={handleEditConfirm}>Samþykkja</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default JudgeScoring;
