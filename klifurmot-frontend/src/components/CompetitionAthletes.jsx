import { useEffect, useState } from "react";
import api from "../services/api";

function CompetitionAthletes({ competitionId }) {
  const [groupedAthletes, setGroupedAthletes] = useState({});
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        const res = await api.get(`/competitions/competitions/${competitionId}/athletes/`);
        setGroupedAthletes(res.data);
      } catch (err) {
        console.error("Error fetching athletes:", err);
        setError("Ekki tókst að sækja keppendur.");
      }
    };
    fetchAthletes();
  }, [competitionId]);

  const filterAthletes = (athletes) => {
    return athletes.filter((a) => {
      const matchesSearch = a.full_name.toLowerCase().includes(search.toLowerCase());
      const matchesGender = !genderFilter || a.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  };

  if (error) return <p>{error}</p>;
  if (!Object.keys(groupedAthletes).length) return <p>Engir keppendur skráðir í þetta mót.</p>;

  return (
    <div>
      <h3>Keppendur</h3>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
        <input
          type="text"
          placeholder="Leita eftir nafni..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
          <option value="">Öll kyn</option>
          <option value="KK">KK</option>
          <option value="KVK">KVK</option>
        </select>
      </div>

      {Object.entries(groupedAthletes).map(([category, athletes]) => {
        const filtered = filterAthletes(athletes);
        if (!filtered.length) return null;

        return (
          <div key={category} style={{ marginBottom: "2rem" }}>
            <h4>{category}</h4>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              fontWeight: "bold",
              padding: "0.5rem 0"
            }}>
              <span>Nafn</span>
              <span>Kyn</span>
              <span>Þjóðerni</span>
            </div>

            <ul style={{ listStyle: "none", padding: 0 }}>
              {filtered.map((a) => (
                <li key={a.id} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "0.25rem 0"
                }}>
                  <span>{a.full_name}</span>
                  <span>{a.gender}</span>
                  <span>{a.nationality}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default CompetitionAthletes;
