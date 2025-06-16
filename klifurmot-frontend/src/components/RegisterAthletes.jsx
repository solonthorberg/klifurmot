import React, { useEffect, useState } from "react";
import api from "../services/api";

function RegisterAthletes({ competitionId, goBack }) {
  const [startlist, setStartlist] = useState([]);
  const [activeRound, setActiveRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [availableAthletes, setAvailableAthletes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [competitionTitle, setCompetitionTitle] = useState("");
  const [advancing, setAdvancing] = useState(null); // Track which round is being advanced
  const [rounds, setRounds] = useState([]); // Store round data with IDs
  const [results, setResults] = useState([]); // Store results to check if round is complete

  useEffect(() => {
    fetchCompetitionDetails();
    fetchStartlist();
    fetchAvailableAthletes();
    fetchRounds();
    fetchResults();
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

  const fetchResults = async () => {
    try {
      const res = await api.get(`/scoring/results/full/${competitionId}/`);
      console.log("Results data:", res.data);
      setResults(res.data);
    } catch (err) {
      console.error("Failed to load results:", err);
    }
  };

  const fetchRounds = async () => {
    try {
      const res = await api.get(`/competitions/rounds/?competition_id=${competitionId}`);
      console.log("Rounds data:", res.data); // Debug log
      setRounds(res.data);
    } catch (err) {
      console.error("Failed to load rounds:", err);
    }
  };

  const handleAdvanceClimbers = async (categoryName, currentRoundName) => {
    console.log("🔥 ADVANCING CLIMBERS FROM:", currentRoundName);
    
    // Find rounds for this specific category
    const categoryRounds = rounds
      .filter(round => {
        if (!round?.competition_category_detail?.category_group_detail?.name || !round?.competition_category_detail?.gender) {
          return false;
        }
        const roundCategoryName = `${round.competition_category_detail.category_group_detail.name} ${round.competition_category_detail.gender}`;
        return roundCategoryName === categoryName;
      })
      .sort((a, b) => a.round_order - b.round_order);

    console.log("Category rounds found:", categoryRounds);

    const currentRoundIndex = categoryRounds.findIndex(r => 
      r.round_group_detail?.name === currentRoundName
    );
    
    if (currentRoundIndex === -1) {
      alert("Gat ekki fundið núverandi umferð.");
      return;
    }

    // Get the current round (FROM) and next round (TO)
    const currentRound = categoryRounds[currentRoundIndex];
    const nextRound = categoryRounds[currentRoundIndex + 1];

    if (!nextRound) {
      alert("Engin næsta umferð til að flytja í.");
      return;
    }

    console.log("Advancing FROM round:", currentRound.id, currentRoundName);
    console.log("Advancing TO round:", nextRound.id, nextRound.round_group_detail.name);

    console.log("🔍 About to show confirmation dialog...");
    console.log("🔍 currentRound:", currentRound);
    console.log("🔍 nextRound:", nextRound);
    console.log("🔍 nextRound.round_group_detail:", nextRound.round_group_detail);
    console.log("🔍 nextRound.round_group_detail.name:", nextRound.round_group_detail.name);

    const confirmMessage = `Ertu viss um að þú viljir flytja bestu keppendur úr ${currentRoundName} í ${nextRound.round_group_detail.name}?`;
    
    console.log("🔍 Confirmation message:", confirmMessage);
    console.log("🔍 Calling window.confirm...");
    
    const userConfirmed = window.confirm(confirmMessage);
    console.log("🔍 User confirmation result:", userConfirmed);
    
    if (!userConfirmed) {
      console.log("🔍 User cancelled the operation");
      return;
    }

    console.log("🔍 User confirmed, proceeding with API call...");

    try {
      setAdvancing(`${categoryName}-${currentRoundName}`);
      
      console.log("🚀 Making API call to:", `/scoring/advance/${currentRound.id}/`);
      
      // Use the CURRENT round ID (the one we're advancing FROM)
      const response = await api.post(`/scoring/advance/${currentRound.id}/`);
      
      console.log("🎯 API Response received:", response);
      console.log("🎯 Response data:", response.data);
      console.log("🎯 Response status:", response.status);
      
      if (response.data.status === "ok") {
        const message = `✅ Tókst að flytja ${response.data.advanced} keppendur úr ${currentRoundName} í ${nextRound.round_group_detail.name}!`;
        console.log("✅ SUCCESS:", message);
        alert(message);
        
        // Refresh the startlist to show updated information
        console.log("🔄 Refreshing startlist...");
        await fetchStartlist();
        console.log("🔄 Refreshing results...");
        await fetchResults(); // Also refresh results
        
        console.log("✅ Data refreshed after advancing climbers");
      } else {
        const errorMsg = `Villa: ${response.data.message || "Óþekkt villa"}`;
        console.error("❌ Advance failed:", response.data);
        alert(errorMsg);
      }
    } catch (err) {
      console.error("❌ ERROR during advance:", err);
      console.error("❌ Error response:", err.response);
      console.error("❌ Error data:", err.response?.data);
      
      const errorMessage = err.response?.data?.detail || "Ekki tókst að flytja keppendur.";
      alert(`Villa: ${errorMessage}`);
    } finally {
      console.log("🏁 Finishing advance operation");
      setAdvancing(null);
    }
  };

  const handleRemoveAthlete = async (athlete, category) => {
    console.log("Removing athlete", athlete, "from", category);

    try {
      const res = await api.post("/competitions/remove-athlete/", {
        competition: competitionId,
        category: category,
        round: activeRound,
        start_order: athlete.start_order,
      });

      console.log(`${athlete.full_name} removed from ${category}`);
      await fetchStartlist();
    } catch (err) {
      console.error("Failed to remove athlete:", err.response?.data || err);
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

      console.log("Athlete registered:", response.data);
      await fetchStartlist();
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to register athlete:", err.response?.data || err);
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
          ? { category: cat.category, athletes: round.athletes || [], roundData: round }
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

  const hasResultsForRound = (categoryName, roundName) => {
    console.log("=== Checking results for ===");
    console.log("Looking for category:", categoryName);
    console.log("Looking for round:", roundName);
    
    const categoryResults = results.find(r => {
      if (!r.category || !r.category.group) {
        return false;
      }
      
      const resultCategoryName = `${r.category.group.name} ${r.category.gender}`;
      return resultCategoryName === categoryName;
    });
    
    if (!categoryResults || !categoryResults.rounds) {
      return false;
    }
    
    const roundResults = categoryResults.rounds.find(r => {
      return r.round_name === roundName;
    });
    
    if (!roundResults || !roundResults.results) {
      return false;
    }
    
    const hasResults = roundResults.results.length > 0;
    console.log("Has results for", categoryName, roundName, ":", hasResults);
    
    return hasResults;
  };

  const getNextRoundForCategory = (categoryName, currentRoundName) => {
    console.log("🔍 Finding next round for:", categoryName, "current:", currentRoundName);
    console.log("🔍 All rounds available:", rounds);
    
    // Find all rounds for this specific category
    const categoryRounds = rounds
      .filter(round => {
        if (!round?.competition_category_detail?.category_group_detail?.name || !round?.competition_category_detail?.gender) {
          console.log("❌ Round missing category data:", round);
          return false;
        }
        
        // Build the category name from the round data
        const roundCategoryName = `${round.competition_category_detail.category_group_detail.name} ${round.competition_category_detail.gender}`;
        console.log("🔍 Comparing:", roundCategoryName, "vs", categoryName);
        
        return roundCategoryName === categoryName;
      })
      .sort((a, b) => a.round_order - b.round_order);

    console.log("🔍 Filtered category rounds:", categoryRounds);

    const currentRoundIndex = categoryRounds.findIndex(r => 
      r.round_group_detail?.name === currentRoundName
    );
    
    console.log("🔍 Current round index:", currentRoundIndex);
    console.log("🔍 Next round would be:", categoryRounds[currentRoundIndex + 1]);
    
    // Return the next round
    return categoryRounds[currentRoundIndex + 1] || null;
  };

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
        {getCategoriesForRound().map((cat, idx) => {
          const nextRound = getNextRoundForCategory(cat.category, activeRound);
          const isAdvancing = advancing === `${cat.category}-${activeRound}`;
          const hasCurrentResults = hasResultsForRound(cat.category, activeRound);
          
          // Show advance button if there's a next round AND current round has results
          const showAdvanceButton = nextRound && hasCurrentResults;
          
          console.log("Button logic for", cat.category, ":", {
            showAdvanceButton,
            hasCurrentResults,
            currentRound: activeRound,
            nextRound: nextRound ? nextRound.round_group_detail.name : null,
            isAdvancing
          });
          
          return (
            <div key={idx} className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">{cat.category}</h5>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleAddAthlete(cat.category)}
                    >
                      + Keppandi
                    </button>
                    {showAdvanceButton && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => {
                          console.log("🔥 BUTTON CLICKED!");
                          console.log("Category:", cat.category);
                          console.log("Current round:", activeRound);
                          console.log("Next round:", nextRound.round_group_detail.name);
                          handleAdvanceClimbers(cat.category, activeRound);
                        }}
                        disabled={isAdvancing}
                        title={`Flytja bestu keppendur úr ${activeRound} í ${nextRound.round_group_detail.name}`}
                      >
                        {isAdvancing ? "Flyti..." : `Flytja í ${nextRound.round_group_detail.name}`}
                      </button>
                    )}
                    {nextRound && !hasCurrentResults && (
                      <button
                        className="btn btn-sm btn-secondary"
                        disabled
                        title={`Þarf fyrst að skrá niðurstöður fyrir ${activeRound}`}
                      >
                        Flytja í {nextRound.round_group_detail.name}
                      </button>
                    )}
                    {!nextRound && (
                      <small className="text-muted">Síðasta umferð</small>
                    )}
                  </div>
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
                                  onClick={() =>
                                    handleRemoveAthlete(athlete, cat.category)
                                  }
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
                {showAdvanceButton && (
                  <div className="card-footer">
                    <small className="text-muted">
                      Flytur úr: {activeRound} → {nextRound.round_group_detail.name}
                    </small>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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

      <div className="alert alert-info mt-4">
        <strong>Athugið:</strong> Til að nota "Flytja" takkann þarf að vera búinn að skrá niðurstöður fyrir núverandi umferð. 
        Kerfið flytur sjálfkrafa bestu keppendur út frá stigagjöf í næstu umferð.
      </div>
    </div>
  );
}

export default RegisterAthletes;