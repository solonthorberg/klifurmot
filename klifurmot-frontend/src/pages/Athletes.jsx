import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from "../services/api";

function Athletes() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        const response = await api.get("athletes/climbers");
        setAthletes(response.data);
        console.log("Fetched athletes:", response.data);
      } catch (error) {
        console.error("Error fetching athletes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAthletes();
  }, []);

  const filteredAthletes = athletes
    .filter(climber => climber.user_account !== null)
    .filter(climber =>
      climber.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <>
      <h2>Keppendur</h2>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Leita af keppanda..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Hleður inn keppendur...</p>
      ) : filteredAthletes.length === 0 ? (
        <p>Engir keppendur fundust.</p>
      ) : (
        <div>
          {filteredAthletes.map(climber => (
            <div key={climber.id} style={{ marginBottom: "1rem" }}>
              <h5>{climber.full_name}</h5>
              <p>Fæðingardagur: {climber.date_of_birth}</p>
              <Link to={`/athletes/${climber.user_account.id}`}>Skoða nánar</Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default Athletes;