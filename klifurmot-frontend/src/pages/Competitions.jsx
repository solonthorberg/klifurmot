import { useEffect, useState } from 'react';
import api from "../services/api";

function Competitions() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('');

  const fetchCompetitions = async () => {
    try {
      const response = await api.get("competitions/competitions/");
      console.log(response.data);
      setCompetitions(response.data);
    } catch (error) {
      console.error("Error fetching competitions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  return (
    <div className="container py-5">
      <h2 className="mb-4">Competitions</h2>

      <div className="row mb-4">
        <div className="col-md-4">
          <input
            type="number"
            className="form-control"
            placeholder="Filter by year"
            value={year}
            onChange={e => setYear(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p>Loading competitions...</p>
      ) : competitions.length === 0 ? (
        <p>No competitions found.</p>
      ) : (
        <div className="row g-4">
          {competitions.map(comp => (
            <div className="col-md-4" key={comp.id}>
              <div className="card h-100 shadow-sm">
                {comp.image_url && (
                  <img src={comp.image_url} className="card-img-top" alt={comp.title} />
                )}
                <div className="card-body">
                  <h5 className="card-title">{comp.title}</h5>
                  <p className="card-text text-muted">{new Date(comp.start_date).toLocaleDateString()}</p>
                  <p className="card-text">{comp.description || 'No description available.'}</p>
                </div>
                <div className="card-footer text-end bg-white">
                  <a href={`/competitions/${comp.id}`} className="btn btn-sm btn-outline-primary">View Details</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Competitions;
