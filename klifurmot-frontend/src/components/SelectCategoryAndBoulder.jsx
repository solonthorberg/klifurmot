import { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";

function SelectCategoryAndBoulder({ roundGroupId, roundOrder, roundName, competitionId, onSelectAthlete, onBack }) {
  const [categories, setCategories] = useState([]);
  const [boulders, setBoulders] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedBoulderId, setSelectedBoulderId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);

    api.get(`/competitions/competition-categories/?competition_id=${competitionId}`)
      .then(res => setCategories(res.data))
      .catch(err => console.error("Failed to fetch categories", err));
  }, [competitionId]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    api.get(`/competitions/boulders/?competition_id=${competitionId}&category_id=${selectedCategoryId}&round_group_id=${roundGroupId}`)
      .then(res => setBoulders(res.data))
      .catch(err => console.error("Failed to fetch boulders", err));
  }, [selectedCategoryId, competitionId, roundGroupId]);

  useEffect(() => {
    if (!selectedBoulderId) return;

    const fetchData = async () => {
      try {
        const startlistRes = await api.get(`/scoring/startlist/?competition_id=${competitionId}&category_id=${selectedCategoryId}&round_group_id=${roundGroupId}`);
        const selectedBoulder = boulders.find(b => b.id === parseInt(selectedBoulderId));

        const baseAthletes = startlistRes.data.map(a => ({
          ...a,
          round_id: roundGroupId,
          round_order: roundOrder,
          boulder_id: selectedBoulderId,
          boulder_number: selectedBoulder?.boulder_number,
          competition_id: competitionId,
          category_id: selectedCategoryId,
          score: { top: false, topAttempts: 0, zone: false, zoneAttempts: 0 }
        }));

        // ✅ Use batch endpoint to get all climbs for this boulder/category/round
        const climbRes = await api.get(`/scoring/climbs/bulk-scores/`, {
          params: {
            round_order: roundOrder,
            boulder_number: selectedBoulder?.boulder_number,
            competition_id: competitionId,
            category_id: selectedCategoryId
          }
        });

        const enriched = baseAthletes.map(athlete => {
          const climb = climbRes.data.find(c => c.climber === athlete.climber_id);
          return {
            ...athlete,
            score: climb ? {
              top: climb.top_reached,
              topAttempts: climb.attempts_top || 0,
              zone: climb.zone_reached,
              zoneAttempts: climb.attempts_zone || 0
            } : athlete.score
          };
        });

        setAthletes(enriched);
      } catch (err) {
        if (err.response?.status === 404) {
          setAthletes(null);
        } else {
          console.error("Failed to fetch athletes or scores", err);
        }
      }
    };

    fetchData();
  }, [selectedBoulderId, selectedCategoryId, competitionId, roundGroupId, roundOrder, boulders]);

  return (
    <div>
      <h3>{roundName}</h3>

      <select value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}>
        <option value="">Flokkur</option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.id}>
            {cat.category_group.name} - {cat.gender}
          </option>
        ))}
      </select>

      <select
        value={selectedBoulderId}
        onChange={e => setSelectedBoulderId(e.target.value)}
        disabled={!selectedCategoryId}
      >
        <option value="">Leið</option>
        {boulders.map(b => (
          <option key={b.id} value={b.id}>Leið {b.boulder_number}</option>
        ))}
      </select>

      {athletes === null && <p>Listi í vinnslu</p>}

      {athletes.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Nafn</th>
              <th>Leið {boulders.find(b => b.id === parseInt(selectedBoulderId))?.boulder_number}</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((athlete, idx) => (
              <tr
                key={idx}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  onSelectAthlete(
                    athlete,
                    athlete.boulder_number,
                    athletes
                  )
                }
              >
                <td>{athlete.start_order}</td>
                <td>{athlete.climber}</td>
                <td>
                  {athlete.score.top ? `1T(${athlete.score.topAttempts})` : `0T(${athlete.score.topAttempts})`}{" "}
                  {athlete.score.zone ? `1Z(${athlete.score.zoneAttempts})` : `0Z(${athlete.score.zoneAttempts})`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button onClick={onBack}>Til baka</button>
    </div>
  );
}

export default SelectCategoryAndBoulder;
