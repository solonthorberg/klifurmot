// JudgeSelectCategoryRoute.jsx
import { useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";

function SelectCategoryAndBoulder({ roundGroupId, competitionId, onSelectAthlete, onBack }) {
  const [categories, setCategories] = useState([]);
  const [boulders, setBoulders] = useState([]);
  const [athletes, setAthletes] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedBoulderId, setSelectedBoulderId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);

    const fetchData = async () => {
      try {
        const res = await api.get(`/competitions/competition-categories/?competition_id=${competitionId}`);
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };

    fetchData();
  }, [competitionId]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    const fetchBoulders = async () => {
      try {
        const res = await api.get(`/competitions/boulders/?competition_id=${competitionId}&category_id=${selectedCategoryId}&round_group_id=${roundGroupId}`);
        setBoulders(res.data);
      } catch (err) {
        console.error("Failed to fetch boulders", err);
      }
    };
    fetchBoulders();
  }, [selectedCategoryId, competitionId, roundGroupId]);

  useEffect(() => {
    if (!selectedBoulderId) return;
    const fetchAthletes = async () => {
      try {
        const res = await api.get(`/scoring/startlist/?competition_id=${competitionId}&category_id=${selectedCategoryId}&round_group_id=${roundGroupId}`);
        const enrichedAthletes = res.data.map(a => ({
          ...a,
          round_id: roundGroupId,
          boulder_id: selectedBoulderId
        }));
        setAthletes(enrichedAthletes);
      } catch (err) {
        if (err.response?.status === 404) {
          setAthletes(null);
        } else {
          console.error("Failed to fetch athletes", err);
        }
      }
    };
    fetchAthletes();
  }, [selectedBoulderId, selectedCategoryId, competitionId, roundGroupId]);

  return (
    <div>
      <h3>Undanúrslit</h3>

      <select
        value={selectedCategoryId}
        onChange={(e) => setSelectedCategoryId(e.target.value)}
      >
        <option value="">Flokkur</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.category_group.name} - {cat.gender}
          </option>
        ))}
      </select>

      <select
        value={selectedBoulderId}
        onChange={(e) => setSelectedBoulderId(e.target.value)}
        disabled={!selectedCategoryId}
      >
        <option value="">Leið</option>
        {boulders.map((b) => (
          <option key={b.id} value={b.id}>Leið {b.boulder_number}</option>
        ))}
      </select>

      {athletes === null && <p>Listi í vinnslu</p>}

      {athletes && athletes.length > 0 && (
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
              <tr key={idx} style={{ cursor: "pointer" }} onClick={() => onSelectAthlete(athlete, boulders.find(b => b.id === parseInt(selectedBoulderId))?.boulder_number, athletes)}>
                <td>{athlete.start_order}</td>
                <td>{athlete.climber}</td>
                <td>0T(0) 0Z(0)</td> {/* Placeholder for current score */}
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
