import { useEffect, useState } from "react";
import api from "../services/api";

function CompetitionResults({ competitionId }) {
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRound, setSelectedRound] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get(`/competitions/competitions/${competitionId}/results/`);
        setResults(res.data); // Expected: [{ category, rounds: [{ round_name, results: [...] }] }]
      } catch (err) {
        console.error("Error fetching results:", err);
        setError("Ekki tókst að sækja niðurstöður.");
      }
    };

    fetchResults();
  }, [competitionId]);

  if (error) return <p>{error}</p>;
  if (!results.length) return <p>Engar niðurstöður skráðar.</p>;

  // extract filters
  const allCategories = [...new Set(results.map(r => r.category))];
  const allRounds = [...new Set(results.flatMap(r => r.rounds.map(ro => ro.round_name)))];

  return (
    <div>
      <h3>Niðurstöður</h3>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <label>
          Flokkur:
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">Allir flokkar</option>
            {allCategories.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
        </label>

        <label>
          Umferð:
          <select value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)}>
            <option value="">Allar umferðir</option>
            {allRounds.map((r, i) => (
              <option key={i} value={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>

      {results
        .filter(cat => !selectedCategory || cat.category === selectedCategory)
        .map((cat, idx) => (
          <div key={idx} style={{ marginBottom: "2rem" }}>
            <h4>{cat.category}</h4>

            {(cat.rounds || [])
              .filter(r => !selectedRound || r.round_name === selectedRound)
              .map((round, j) => (
                <div key={j} style={{ marginBottom: "1rem", marginLeft: "1rem" }}>
                  <h5>{round.round_name}</h5>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "50px 1fr 80px 80px",
                    fontWeight: "bold",
                    gap: "1rem",
                    paddingBottom: "0.5rem"
                  }}>
                    <span>Nr.</span>
                    <span>Nafn</span>
                    <span>Top</span>
                    <span>Zone</span>
                  </div>

                  {(round.results || []).map((athlete, i) => (
                    <div key={i} style={{
                      display: "grid",
                      gridTemplateColumns: "50px 1fr 80px 80px",
                      gap: "1rem",
                      padding: "0.25rem 0"
                    }}>
                      <span>{athlete.rank}</span>
                      <span>{athlete.full_name}</span>
                      <span>{athlete.tops}T ({athlete.attempts_top})</span>
                      <span>{athlete.zones}Z ({athlete.attempts_zone})</span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        ))}
    </div>
  );
}

export default CompetitionResults;