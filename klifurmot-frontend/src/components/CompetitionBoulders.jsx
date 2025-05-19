import { useEffect, useState } from "react";
import api from "../services/api";

function CompetitionBoulders({ competitionId }) {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRound, setSelectedRound] = useState("");

  useEffect(() => {
    const fetchBoulders = async () => {
      try {
        const res = await api.get(`/competitions/competitions/${competitionId}/boulders/`);
        setCategories(res.data);
      } catch (err) {
        console.error("Error loading boulders:", err);
        setError("Ekki tókst að sækja leiðirnar.");
      }
    };

    fetchBoulders();
  }, [competitionId]);

  if (error) return <p>{error}</p>;
  if (!categories.length) return <p>Engar leiðir skráðar fyrir þetta mót.</p>;

  const allCategories = [...new Set(categories.map(c => c.category))];
  const allRounds = [...new Set(categories.flatMap(c => c.rounds.map(r => r.round_name)))];

  return (
    <div>
      <h3>Leiðir</h3>

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

      {categories
        .filter(cat => !selectedCategory || cat.category === selectedCategory)
        .map((cat, i) => (
          <div key={i} style={{ marginBottom: "2rem" }}>
            <h4>{cat.category}</h4>
            {(cat.rounds || [])
              .filter(round => !selectedRound || round.round_name === selectedRound)
              .map((round, j) => (
                <div key={j} style={{ marginBottom: "1rem", marginLeft: "1rem" }}>
                  <h5>{round.round_name}</h5>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                    {(round.boulders || []).map((boulder, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid #ccc",
                          padding: "1rem",
                          borderRadius: "8px",
                          width: "120px",
                          textAlign: "center",
                        }}
                      >
                        <div><strong>Boulder {boulder.number}</strong></div>
                        <div>{boulder.tops}T</div>
                        <div>{boulder.zones}Z</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ))}
    </div>
  );
}

export default CompetitionBoulders;
