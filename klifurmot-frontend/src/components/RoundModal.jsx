import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../services/api";

function RoundModal({ existingRound, onClose, onSelectRound }) {
  const [loading, setLoading] = useState(true);
  const [roundGroups, setRoundGroups] = useState([]);
  const [selectedRoundGroupId, setSelectedRoundGroupId] = useState("");
  const [athleteCount, setAthleteCount] = useState("");
  const [boulderCount, setBoulderCount] = useState("");

  useEffect(() => {
    const fetchRoundGroups = async () => {
      try {
        const response = await api.get("/competitions/round-groups/");
        console.log("📡 API response for round-groups:", response.data);
        setRoundGroups(response.data);

        // If editing existing round, populate fields
        if (existingRound) {
          setSelectedRoundGroupId(
            existingRound.round_group_id?.toString() || ""
          );
          setAthleteCount(existingRound.athlete_count?.toString() || "");
          setBoulderCount(existingRound.boulder_count?.toString() || "");
        }
      } catch (err) {
        console.error("❌ Failed to fetch round groups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoundGroups();
    console.log("🟢 RoundModal mounted");

    return () => console.log("🔴 RoundModal unmounted");
  }, [existingRound]);

  const handleConfirm = () => {
    if (!selectedRoundGroupId || !athleteCount || !boulderCount) {
      alert("Please fill in all fields");
      return;
    }

    const selectedRoundGroup = roundGroups.find(
      (rg) => rg.id === parseInt(selectedRoundGroupId)
    );

    if (!selectedRoundGroup) {
      alert("Please select a valid round");
      return;
    }

    const round = {
      round_group_id: selectedRoundGroup.id,
      name: selectedRoundGroup.name,
      athlete_count: parseInt(athleteCount),
      boulder_count: parseInt(boulderCount),
      _id: existingRound?._id || `${Date.now()}-${Math.random()}`,
    };

    // If editing, preserve the index
    if (existingRound?.index !== undefined) {
      round.index = existingRound.index;
    }

    console.log("✅ Confirming round:", round);
    onSelectRound(round);
  };

  if (!document.body) return null;

  return createPortal(
    <div
      className="custom-modal"
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="custom-modal-content"
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "500px",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {existingRound ? "Breyta umferð" : "Bæta við umferð"}
        </h3>

        {loading ? (
          <p>Hleður...</p>
        ) : (
          <>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Umferð:
                <select
                  value={selectedRoundGroupId}
                  onChange={(e) => setSelectedRoundGroupId(e.target.value)}
                  disabled={!!existingRound} // Don't allow changing round type when editing
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    marginTop: "0.25rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">-- Veldu umferð --</option>
                  {roundGroups.map((rg) => (
                    <option key={rg.id} value={rg.id}>
                      {rg.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Fjöldi keppenda:
                <input
                  type="number"
                  value={athleteCount}
                  onChange={(e) => setAthleteCount(e.target.value)}
                  min="1"
                  max="100"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    marginTop: "0.25rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
              </label>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Fjöldi leiða:
                <input
                  type="number"
                  value={boulderCount}
                  onChange={(e) => setBoulderCount(e.target.value)}
                  min="1"
                  max="20"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    marginTop: "0.25rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={onClose}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Hætta við
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {existingRound ? "Vista breytingar" : "Staðfesta"}
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
