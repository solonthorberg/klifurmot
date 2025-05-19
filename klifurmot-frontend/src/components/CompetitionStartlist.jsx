import { useEffect, useState } from "react";
import api from "../services/api";

function CompetitionStartlist({ competitionId }) {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRound, setSelectedRound] = useState("");

  useEffect(() => {
    const fetchStartlists = async () => {
      try {
        const res = await api.get(`/competitions/competitions/${competitionId}/startlist/`);
        setCategories(res.data);
      } catch (err) {
        console.error("Error fetching start list:", err);
        setError("Ekki tókst að sækja ráslista.");
      }
    };

    fetchStartlists();
  }, [competitionId]);

  if (error) return <p>{error}</p>;
  if (!categories.length) return <p>Engir keppendur í ráslista.</p>;

  // Gather unique filters
  const allCategories = [...new Set(categories.map(c => c.category))];
  const allRounds = [...new Set(
    categories.flatMap(c => c.rounds.map(r => r.round_name))
  )];

  return (
    <div>
      <h3>Ráslisti</h3>

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
        .map((cat, idx) => (
          <div key={idx} style={{ marginBottom: "2rem" }}>
            <h4>{cat.category}</h4>

            {(cat.rounds || [])
              .filter(round => !selectedRound || round.round_name === selectedRound)
              .map((round, j) => (
                <div key={j} style={{ marginBottom: "1rem", marginLeft: "1rem" }}>
                  <h5>{round.round_name}</h5>

                  <div style={{ fontWeight: "bold", display: "flex", gap: "1rem", paddingBottom: "0.5rem" }}>
                    <span>Nr.</span>
                    <span>Nafn</span>
                  </div>

                  {(round.athletes || []).map((athlete, i) => (
                    <div key={i} style={{ display: "flex", gap: "1rem" }}>
                      <span>{athlete.start_order}</span>
                      <span>{athlete.full_name}</span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        ))}
    </div>
  );
}

export default CompetitionStartlist;
