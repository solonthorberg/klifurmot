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
          const group = round.round_group;
          if (group && !seen.has(group.id)) {
            seen.add(group.id);
            uniqueGroups.push({
              id: group.id,
              name: group.name,
              round_order: round.round_order
            });
          }
        });

        setRoundGroups(uniqueGroups);
        setCompetitionTitle(compRes.data.title);
      } catch (err) {
        console.error(err);
        setError("Ekki tókst að sækja umferðir eða mótsupplýsingar.");
      }
    };

    fetchData();
  }, [competitionId]);

  const handleClick = (roundGroupId, roundOrder) => {
    onContinue(roundGroupId, roundOrder);
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
              onClick={() => handleClick(group.id, group.round_order)}
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
