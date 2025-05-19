import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function AthleteDetail() {
  const { id } = useParams();
  const [athlete, setAthlete] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAthlete = async () => {
      try {
        const res = await api.get(`/athletes/${id}/`);
        setAthlete(res.data);
      } catch (err) {
        console.error("Error fetching athlete:", err);
        setError("Ekki tókst að sækja upplýsingar um keppanda.");
      }
    };

    fetchAthlete();
  }, [id]);

  if (error) return <p>{error}</p>;
  if (!athlete) return <p>Sæki upplýsingar...</p>;

  const calculateAge = (dob) => {
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (
      now.getMonth() < birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>{athlete.full_name}</h2>
      <p><strong>Aldur:</strong> {calculateAge(athlete.date_of_birth)} ára</p>
      <p><strong>Hæð:</strong> {athlete.height_cm || "–"} cm</p>
      <p><strong>Vænghaf:</strong> {athlete.wingspan_cm || "–"} cm</p>
      <p><strong>Kyn:</strong> {athlete.gender}</p>
      <p><strong>Þjóðerni:</strong> {athlete.nationality}</p>
      <p><strong>Flokkur:</strong> {athlete.category}</p>
      <p><strong>Mótaþáttaka:</strong> {athlete.competitions_count}</p>
      <p><strong>Sigrar:</strong> {athlete.wins_count}</p>

      {athlete.competitions?.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h4>Mót sem keppandi hefur tekið þátt í:</h4>
          <ul>
            {athlete.competitions.map((comp) => (
              <li key={comp.id}>
                {comp.title} – {comp.category} – {new Date(comp.start_date).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AthleteDetail;
