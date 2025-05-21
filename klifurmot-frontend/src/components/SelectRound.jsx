// SelectRound.jsx
import { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";

function SelectRound({ competitionId, onContinue }) {
  const [roundGroups, setRoundGroups] = useState([]);
  const [competitionTitle, setCompetitionTitle] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);

    const fetchData = async () => {
      try {
        const [roundRes, compRes] = await Promise.all([
          api.get(`/competitions/rounds/?competition_id=${competitionId}`),
          api.get(`/competitions/competitions/${competitionId}/`)
        ]);

        const uniqueGroups = [];
        const seen = new Set();
        roundRes.data.forEach(round => {
          if (round.round_group && !seen.has(round.round_group.id)) {
            seen.add(round.round_group.id);
            uniqueGroups.push({ id: round.round_group.id, name: round.round_group.name });
          }
        });

        setRoundGroups(uniqueGroups);
        setCompetitionTitle(compRes.data.title);
      } catch (err) {
        setError("Ekki tókst að sækja umferðir eða mótsupplýsingar.");
      }
    };

    fetchData();
  }, [competitionId]);

  const handleClick = (roundGroupId) => {
    console.log("Selected round group ID:", roundGroupId);
    onContinue(roundGroupId);
  };

  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h3>{competitionTitle}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {roundGroups.map((group) => (
          <div
            key={group.id}
            style={{
              border: "1px solid #ccc",
              padding: "1rem",
              textAlign: "center",
              borderRadius: "4px",
            }}
          >
            <h4>{group.name}</h4>
            <button
              onClick={() => handleClick(group.id)}
              style={{ padding: "0.5rem 1rem", background: "#ddd", border: "none", cursor: "pointer" }}
            >
              Dæma
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SelectRound;
