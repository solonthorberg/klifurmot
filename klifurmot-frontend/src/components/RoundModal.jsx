import { useEffect, useState } from "react";
import api from "../services/api";

function RoundModal({ onClose, onSelectRound }) {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRounds = async () => {
      try {
        const res = await api.get("/competitions/round-groups/");
        setRounds(res.data);
      } catch (err) {
        console.error("Failed to fetch rounds:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRounds();
  }, []);

  return (
    <div className="modal">
      <div className="modal-content">
        <h4>Veldu umferð</h4>
        <button onClick={onClose}>Loka</button>
        {loading ? (
          <p>Hleður umferðum...</p>
        ) : (
          <ul>
            {rounds.map((round) => (
              <li key={round.id}>
                <button onClick={() => onSelectRound(round)}>{round.name}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default RoundModal;
