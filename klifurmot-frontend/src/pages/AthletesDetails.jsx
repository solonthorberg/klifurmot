import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function AthletesDetails() {
  const { id } = useParams(); // Get athlete's user_account ID from the URL
  const [athlete, setAthlete] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAthlete = async () => {
      try {
        const res = await api.get(`/athletes/${id}/`);
        setAthlete(res.data);
        console.log(res)
      } catch (err) {
        console.error("Error fetching athlete:", err);
        setError("Ekki tókst að sækja keppandann.");
      }
    };

    if (id) {
      fetchAthlete();
    }
  }, [id]);

  if (error) return <p>{error}</p>;
  if (!athlete) return <p>Hleð inn gögnum...</p>;

  return (
    <div>
      <h2>{athlete.full_name}</h2>

      <p><strong>Aldur:</strong> {athlete.date_of_birth}</p>
      <p><strong>Kyn:</strong> {athlete.gender}</p>
      <p><strong>Þjóðerni:</strong> {athlete.nationality}</p>
      <p><strong>Hæð:</strong> {athlete.height_cm} cm</p>
      <p><strong>Vænghaf:</strong> {athlete.wingspan_cm} cm</p>
      <p><strong>Flokkur:</strong> {athlete.category}</p>
      <p><strong>Þátttaka í mótum:</strong> {athlete.competitions_count}</p>
      <p><strong>Sigrar:</strong> {athlete.wins_count}</p>

      {athlete.competitions.length > 0 && (
        <div>
          <h3>Mót sem viðkomandi hefur tekið þátt í:</h3>
          <ul>
            {athlete.competitions.map((comp) => (
              <li key={comp.id}>
                <strong>{comp.title}</strong> – {comp.category} – {new Date(comp.start_date).toLocaleDateString()}
                <div>
                  <h4>Results:</h4>
                  <ul>
                    {comp.results.map((result, index) => (
                      <li key={index}>
                        Round: {result.round_name} - Rank: {result.rank}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AthletesDetails;
