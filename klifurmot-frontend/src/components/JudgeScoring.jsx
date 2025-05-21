// JudgeScoring.jsx
import { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";

function JudgeScoring({ athlete, boulderNumber, onNext, onPrevious }) {
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
        const res = await api.get(`/scoring/climbs/?round_id=${athlete.round_id}&boulder_id=${athlete.boulder_id}`);
        const current = res.data.find(item => item.climber === athlete.climber_id);
        if (current) {
          const fetchedScore = {
            zoneAttempts: current.attempts_zone || 0,
            topAttempts: current.attempts_top || 0,
            gotZone: current.zone_reached || false,
            gotTop: current.top_reached || false,
          };
          setScore(fetchedScore);
        }
      } catch (err) {
        console.error("Failed to fetch current score", err);
      }
    };

    fetchScore();
  }, [athlete]);

  const updateBackend = async (newScore) => {
    try {
      console.log("Sending updated score to backend:", newScore);
      await api.post(`/scoring/climbs/record_attempt/`, {
        climber: athlete.climber_id,
        boulder: athlete.boulder_id,
        attempts_zone: newScore.zoneAttempts,
        attempts_top: newScore.topAttempts,
        zone_reached: newScore.gotZone,
        top_reached: newScore.gotTop
      });
    } catch (err) {
      console.error("Failed to update score", err);
    }
  };

  const handleScore = (type) => {
    if (editMode || score.gotTop) return;
    const newScore = { ...score };
    if (type === "zone") {
      if (!score.gotZone) {
        newScore.zoneAttempts += 1;
        newScore.topAttempts += 1;
        newScore.gotZone = true;
      }
    } else if (type === "top") {
      if (!score.gotTop) {
        newScore.topAttempts += 1;
        newScore.zoneAttempts += score.gotZone ? 0 : 1;
        newScore.gotTop = true;
        newScore.gotZone = true;
      }
    } else if (type === "attempt") {
      if (!score.gotZone) {
        newScore.zoneAttempts += 1;
      }
      if (!score.gotTop) {
        newScore.topAttempts += 1;
      }
    }
    setScore(newScore);
    updateBackend(newScore);
  };

  const handleEditChange = (field, delta) => {
    setTempScore(prev => {
      const newValue = Math.max((prev[field] || 0) + delta, 0);
      const updated = { ...prev, [field]: newValue };
      if (field === "zoneAttempts" && newValue === 0) updated.gotZone = false;
      if (field === "topAttempts" && newValue === 0) updated.gotTop = false;
      return updated;
    });
  };

  const toggleBooleanField = (field) => {
    setTempScore(prev => ({ ...prev, [field]: !prev[field] }));
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
        <button onClick={() => handleScore("zone")} disabled={editMode || score.gotTop || score.gotZone}>Zone</button>
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
              <p>Zone náð: <input type="checkbox" checked={tempScore.gotZone} onChange={() => toggleBooleanField("gotZone")} /></p>
            </div>
            <div>
              <p>Tilraunir Topp</p>
              <button onClick={() => handleEditChange("topAttempts", 1)}>▲</button>
              <div className="score-display">{tempScore.topAttempts}</div>
              <button onClick={() => handleEditChange("topAttempts", -1)}>▼</button>
              <p>Topp náð: <input type="checkbox" checked={tempScore.gotTop} onChange={() => toggleBooleanField("gotTop")} /></p>
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
