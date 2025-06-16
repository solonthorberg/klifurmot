import React, { useEffect, useState } from "react";
import api from "../services/api";

function RegisterAthletes({ competitionId, goBack }) {
  if (!competitionId) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          No competition selected. Please go back and select a competition.
        </div>
        <button className="btn btn-secondary" onClick={goBack}>
          ← Til baka
        </button>
      </div>
    );
  }

  const [startlist, setStartlist] = useState([]);
  const [activeRound, setActiveRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [availableAthletes, setAvailableAthletes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [competitionTitle, setCompetitionTitle] = useState("");

  useEffect(() => {
    fetchCompetitionDetails();
    fetchStartlist();
    fetchAvailableAthletes();
  }, [competitionId]);

  const fetchCompetitionDetails = async () => {
    try {
      const res = await api.get(`/competitions/competitions/${competitionId}/`);
      setCompetitionTitle(res.data.title);
    } catch (err) {
      console.error("Failed to load competition details:", err);
    }
  };

  const fetchStartlist = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/competitions/competitions/${competitionId}/startlist/`
      );
      setStartlist(res.data);

      const allRounds = res.data.flatMap((cat) =>
        cat.rounds.map((r) => r.round_name)
      );
      const uniqueRounds = [...new Set(allRounds)];
      if (uniqueRounds.length > 0 && !activeRound) {
        setActiveRound(uniqueRounds[0]);
      }
    } catch (err) {
      console.error("Failed to load startlist:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAthletes = async () => {
    try {
      const res = await api.get("/athletes/climbers/");
      setAvailableAthletes(res.data);
    } catch (err) {
      console.error("Failed to load athletes:", err);
    }
  };

  const handleRemoveAthlete = async (athlete, category) => {
    console.log("🔥 Removing athlete", athlete, "from", category);

    // 🔁 TEMP: skip confirm to ensure this runs
    // if (!confirm(...)) return;

    try {
      const res = await api.post("/competitions/remove-athlete/", {
        competition: competitionId,
        category: category,
        round: activeRound,
        start_order: athlete.start_order,
      });

      await fetchStartlist();
      alert(`${athlete.full_name} hefur verið fjarlægð(ur) úr ${category}`);
    } catch (err) {
      console.error("Failed to remove athlete:", err);
      alert(err.response?.data?.detail || "Ekki tókst að fjarlægja keppanda");
    }
  };

  const handleAddAthlete = (category) => {
    setSelectedCategory(category);
    setShowAddModal(true);
    setSearchQuery("");
  };

  const handleSelectAthlete = async (athlete) => {
    if (!selectedCategory || !activeRound) return;

    try {
      const response = await api.post("/competitions/register-athlete/", {
        competition: competitionId,
        category: selectedCategory,
        round: activeRound,
        climber: athlete.id,
      });

      await fetchStartlist();
      setShowAddModal(false);
      alert(
        response.data.detail ||
          `${athlete.user_account?.full_name} hefur verið skráð(ur) í ${selectedCategory}`
      );
    } catch (err) {
      console.error("❌ Failed to register athlete:", err);
      alert(err.response?.data?.detail || "Ekki tókst að skrá keppanda");
    }
  };

  const roundNames = [
    ...new Set(startlist.flatMap((cat) => cat.rounds.map((r) => r.round_name))),
  ];

  const getCategoriesForRound = () =>
    startlist
      .map((cat) => {
        const round = cat.rounds.find((r) => r.round_name === activeRound);
        return round
          ? { category: cat.category, athletes: round.athletes || [] }
          : null;
      })
      .filter(Boolean);

  const getFilteredAthletes = () => {
    if (!selectedCategory) return [];
    const gender = selectedCategory.includes("KVK") ? "KVK" : "KK";

    return availableAthletes.filter((athlete) => {
      const nameMatch = athlete.user_account?.full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const genderMatch = athlete.user_account?.gender === gender;
      return nameMatch && genderMatch;
    });
  };

  if (loading) {
    return <div className="container mt-4">Hleður...</div>;
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h3">Skrá keppendur</h2>
          {competitionTitle && (
            <p className="text-muted mb-0">{competitionTitle}</p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={goBack}>
          ← Til baka
        </button>
      </div>

      <ul className="nav nav-tabs mb-4">
        {roundNames.map((name) => (
          <li className="nav-item" key={name}>
            <button
              className={`nav-link ${activeRound === name ? "active" : ""}`}
              onClick={() => setActiveRound(name)}
            >
              {name}
            </button>
          </li>
        ))}
      </ul>

      <div className="row">
        {getCategoriesForRound().map((cat, idx) => (
          <div key={idx} className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{cat.category}</h5>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleAddAthlete(cat.category)}
                >
                  + Keppandi
                </button>
              </div>
              <div className="card-body">
                {cat.athletes.length === 0 ? (
                  <p className="text-muted">Engir keppendur skráðir</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Nr.</th>
                          <th>Nafn</th>
                          <th>Flokkur</th>
                          <th>Kyn</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.athletes.map((athlete, i) => (
                          <tr key={`${athlete.full_name}-${i}`}>
                            <td>{athlete.start_order}</td>
                            <td>{athlete.full_name}</td>
                            <td>{athlete.category}</td>
                            <td>{athlete.gender}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => {
                                  console.log("❌ Clicked remove:", athlete);
                                  handleRemoveAthlete(athlete, cat.category);
                                }}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Bæta við keppanda - {selectedCategory}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control mb-3"
                  placeholder="Leita að keppanda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {getFilteredAthletes().length === 0 ? (
                    <p className="text-muted">Engir keppendur fundust</p>
                  ) : (
                    <div className="list-group">
                      {getFilteredAthletes().map((athlete) => (
                        <button
                          key={athlete.id}
                          className="list-group-item list-group-item-action"
                          onClick={() => handleSelectAthlete(athlete)}
                        >
                          <div className="d-flex justify-content-between">
                            <div>
                              <strong>{athlete.user_account?.full_name}</strong>
                              <br />
                              <small className="text-muted">
                                {athlete.user_account?.date_of_birth} •{" "}
                                {athlete.user_account?.gender}
                              </small>
                            </div>
                            <span className="badge bg-primary">Velja</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Hætta við
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisterAthletes;
