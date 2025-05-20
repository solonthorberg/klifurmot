import { useEffect, useState } from "react";
import api from "../services/api";

function CompetitionAthletes({ competitionId }) {
  const [athletes, setAthletes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        // Fetch athletes from the API
        const res = await api.get(`/athletes/registrations/?competition=${competitionId}`);

        console.log("Fetched athletes data:", res.data);
        
        // Assuming the response data includes a 'climber' field with user account details
        setAthletes(res.data);
        setFiltered(res.data);
      } catch (err) {
        console.error("Error fetching athletes:", err);
        setError("Ekki tókst að sækja keppendur.");
      }
    };
    fetchAthletes();
  }, [competitionId]);

  useEffect(() => {
    let result = athletes;

    // Filter by search
    if (search.trim() !== "") {
      result = result.filter(a =>
        a.climber.user_account.full_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by gender
    if (genderFilter !== "") {
      result = result.filter(a => a.climber.user_account.gender === genderFilter);
    }

    // Filter by category
    if (categoryFilter !== "") {
      result = result.filter(a => 
        a.competition_category?.category_group?.name?.includes(categoryFilter)
      );
    }

    setFiltered(result);
  }, [search, genderFilter, categoryFilter, athletes]);

  const uniqueCategories = [...new Set(athletes.map(a => a.competition_category?.category_group?.name))];

  if (error) return <p>{error}</p>;
  if (!athletes.length) return <p>Engir keppendur skráðir í þetta mót.</p>;

  return (
    <div>
      <h3>Keppendur ({filtered.length})</h3>

      <div>
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


        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Allir flokkar</option>
          {uniqueCategories.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <span>Nafn</span>
        <span>Flokkur</span>
        <span>Kyn</span>
        <span>Þjóðerni</span>
      </div>

      <ul>
        {filtered.map((a) => (
          <li key={a.id}>
            <span>{a.climber.user_account.full_name}</span>
            <span>{a.competition_category.category_group.name}</span>
            <span>{a.climber.user_account.gender}</span>
            <span>{a.climber.user_account.nationality.name_en}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CompetitionAthletes;
