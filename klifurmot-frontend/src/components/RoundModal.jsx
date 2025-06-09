import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../services/api";

function RoundModal({ onClose, onSelectRound, existingRound = null }) {
  const [roundGroups, setRoundGroups] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [athletes, setAthletes] = useState("");
  const [boulders, setBoulders] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRounds = async () => {
      try {
        const res = await api.get("/competitions/round-groups/");
        setRoundGroups(res.data);
      } catch (err) {
        console.error("Failed to fetch round groups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRounds();
  }, []);

  useEffect(() => {
    console.log("RoundModal is open", existingRound);
    if (existingRound) {
      setSelectedRoundId(existingRound.id?.toString() || "");
      setAthletes(existingRound.athlete_count?.toString() || "");
      setBoulders(existingRound.boulder_count?.toString() || "");
    } else {
      setSelectedRoundId("");
      setAthletes("");
      setBoulders("");
    }
  }, [existingRound]);

  const handleConfirm = () => {
    if (!selectedRoundId || !athletes || !boulders) return;

    const selectedRound = roundGroups.find(
      (r) => r.id === parseInt(selectedRoundId)
    );
    if (!selectedRound) return;

    const round = {
      id: selectedRound.id,
      name: selectedRound.name,
      athlete_count: parseInt(athletes),
      boulder_count: parseInt(boulders),
    };

    if (existingRound?.index !== undefined) {
      round.index = existingRound.index;
      round._id = existingRound._id; // keep ID stable when editing
    }

    if (!round._id) {
      round._id = `${Date.now()}-${Math.random()}`;
    }

    console.log("Confirmed round:", round);
    onSelectRound(round);
  };

  return createPortal(
    <div
      className="custom-modal d-flex justify-content-center align-items-center position-fixed w-100 h-100 top-0 start-0"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9999 }}
    >
      <div
        className="custom-modal-content bg-white p-4 rounded"
        style={{ maxWidth: "500px", width: "90%" }}
      >
        <h4>{existingRound ? "Breyta umferð" : "Bæta við umferð"}</h4>

        {loading ? (
          <p>Hleður...</p>
        ) : (
          <>
            <div className="mb-3">
              <label className="form-label">Umferð:</label>
              <select
                className="form-select"
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                disabled={!!existingRound}
              >
                <option value="">-- Veldu umferð --</option>
                {roundGroups.map((rg) => (
                  <option key={rg.id} value={rg.id}>
                    {rg.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Fjöldi keppenda:</label>
              <input
                type="number"
                className="form-control"
                value={athletes}
                onChange={(e) => setAthletes(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Fjöldi leiða:</label>
              <input
                type="number"
                className="form-control"
                value={boulders}
                onChange={(e) => setBoulders(e.target.value)}
              />
            </div>

            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-primary" onClick={handleConfirm}>
                {existingRound ? "Vista breytingar" : "Staðfesta"}
              </button>
              <button className="btn btn-danger" onClick={onClose}>
                Hætta við
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default RoundModal;
