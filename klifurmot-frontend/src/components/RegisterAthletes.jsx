import React, { useEffect, useState } from "react";
import api from "../services/api";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable athlete row component with dedicated drag handle
function SortableAthleteRow({ athlete, index, onRemove, isReordering }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: athlete.climber_id || athlete.id || `athlete-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isReordering ? 0.7 : 1,
    backgroundColor: isReordering ? "#f8f9fa" : "transparent",
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {/* Dedicated drag handle column */}
      <td
        {...attributes}
        {...listeners}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          width: "30px",
          textAlign: "center",
          userSelect: "none",
        }}
      >
        ⋮⋮
      </td>
      <td>{athlete.start_order}</td>
      <td>
        {athlete.full_name}
        {isReordering && (
          <span className="ms-2 text-muted">
            <small>(Uppfæri...)</small>
          </span>
        )}
      </td>
      <td>{athlete.category || athlete.age_category}</td>
      <td>{athlete.gender}</td>
      {/* Remove button - completely separate from drag functionality */}
      <td>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => onRemove(athlete)}
          disabled={isReordering}
        >
          ×
        </button>
      </td>
    </tr>
  );
}

// Judge Link Component
function JudgeLinkSection({ competitionId }) {
  const [availableJudges, setAvailableJudges] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [existingLinks, setExistingLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [editingLink, setEditingLink] = useState(null);

  useEffect(() => {
    fetchAvailableJudges();
    fetchExistingLinks();
    // Set default expiration to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setExpirationDate(tomorrow.toISOString().slice(0, 16)); // Format for datetime-local input
  }, []);

  const fetchAvailableJudges = async () => {
    try {
      const res = await api.get("/accounts/users/");
      setAvailableJudges(res.data);
    } catch (err) {
      console.error("Failed to fetch judges:", err);
    }
  };

  const fetchExistingLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const res = await api.get(
        `/accounts/judge-links/competition/${competitionId}/`
      );
      setExistingLinks(res.data);
    } catch (err) {
      console.error("Failed to fetch existing links:", err);
      // For now, set empty array if endpoint doesn't exist
      setExistingLinks([]);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const generateJudgeLink = async () => {
    if (!selectedJudge) {
      alert("Veldu dómara fyrst");
      return;
    }

    if (!expirationDate) {
      alert("Veldu gildistíma fyrst");
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        user_id: selectedJudge,
      };

      // Add expiration date if provided
      if (expirationDate) {
        payload.expires_at = new Date(expirationDate).toISOString();
      }

      const res = await api.post(
        `/accounts/judge-links/${competitionId}/`,
        payload
      );

      setGeneratedLink(res.data.judge_link);
      console.log("✅ Judge link generated:", res.data.judge_link);

      // Refresh the existing links list
      await fetchExistingLinks();
    } catch (err) {
      console.error("❌ Failed to generate judge link:", err);
      alert(
        `Ekki tókst að búa til dómaraslóð: ${
          err.response?.data?.detail || err.message
        }`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (link = generatedLink) => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const deleteJudgeLink = async (linkId) => {
    if (!confirm("Ertu viss um að þú viljir eyða þessari dómaraslóð?")) {
      return;
    }

    try {
      // Updated URL to match the backend pattern
      await api.delete(`/accounts/judge-links/link/${linkId}/`);
      console.log("✅ Judge link deleted");
      await fetchExistingLinks();
    } catch (err) {
      console.error("❌ Failed to delete judge link:", err);
      alert(
        `Ekki tókst að eyða dómaraslóð: ${
          err.response?.data?.detail || err.message
        }`
      );
    }
  };

  const updateJudgeLink = async (linkId, newExpirationDate) => {
    try {
      // Updated URL to match the backend pattern
      await api.patch(`/accounts/judge-links/link/${linkId}/`, {
        expires_at: new Date(newExpirationDate).toISOString(),
      });
      console.log("✅ Judge link updated");
      setEditingLink(null);
      await fetchExistingLinks();
    } catch (err) {
      console.error("❌ Failed to update judge link:", err);
      alert(
        `Ekki tókst að uppfæra dómaraslóð: ${
          err.response?.data?.detail || err.message
        }`
      );
    }
  };

  const getJudgeName = (userId) => {
    const judge = availableJudges.find((j) => j.id === userId);
    return judge ? judge.full_name || judge.username : "Óþekktur notandi";
  };

  const isLinkExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">📋 Dómaraslóðir</h5>
      </div>
      <div className="card-body">
        {/* Create New Judge Link Section */}
        <div className="row align-items-end mb-4">
          <div className="col-md-3">
            <label className="form-label">Veldu dómara:</label>
            <select
              className="form-select"
              value={selectedJudge}
              onChange={(e) => setSelectedJudge(e.target.value)}
            >
              <option value="">-- Veldu dómara --</option>
              {availableJudges.map((judge) => (
                <option key={judge.id} value={judge.id}>
                  {judge.full_name || judge.username} ({judge.email})
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Gildistími:</label>
            <input
              type="datetime-local"
              className="form-control"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)} // Prevent past dates
            />
          </div>
          <div className="col-md-3">
            <button
              className="btn btn-primary"
              onClick={generateJudgeLink}
              disabled={!selectedJudge || !expirationDate || isGenerating}
            >
              {isGenerating ? "Býr til..." : "Búa til slóð"}
            </button>
          </div>
        </div>

        {generatedLink && (
          <div className="mb-4">
            <label className="form-label">Nýja dómaraslóð:</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                value={generatedLink}
                readOnly
              />
              <button
                className="btn btn-outline-secondary"
                onClick={() => copyToClipboard(generatedLink)}
                title="Afrita slóð"
              >
                {linkCopied ? "✅ Afritað!" : "📋 Afrita"}
              </button>
            </div>
            <small className="text-muted">
              Sendu þessa slóð til dómarans. Slóðin rennur út:{" "}
              {new Date(expirationDate).toLocaleString("is-IS")}
            </small>
          </div>
        )}

        {/* Existing Judge Links Section */}
        <div className="mt-4">
          <h6>Núverandi dómaraslóðir:</h6>
          {isLoadingLinks ? (
            <p className="text-muted">Hleður...</p>
          ) : existingLinks.length === 0 ? (
            <p className="text-muted">Engar dómaraslóðir til staðar</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Dómari</th>
                    <th>Dómaraslóð</th>
                    <th>Rennur út</th>
                    <th>Staða</th>
                    <th>Aðgerðir</th>
                  </tr>
                </thead>
                <tbody>
                  {existingLinks.map((link) => (
                    <tr key={link.id}>
                      <td>{getJudgeName(link.user_id)}</td>
                      <td>
                        <div className="input-group input-group-sm">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={link.judge_link}
                            readOnly
                            style={{ fontSize: "0.75rem" }}
                          />
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => copyToClipboard(link.judge_link)}
                            title="Afrita slóð"
                          >
                            📋
                          </button>
                        </div>
                      </td>
                      <td>
                        {editingLink === link.id ? (
                          <div className="d-flex gap-1">
                            <input
                              type="datetime-local"
                              className="form-control form-control-sm"
                              defaultValue={new Date(link.expires_at)
                                .toISOString()
                                .slice(0, 16)}
                              onChange={(e) => {
                                link.newExpirationDate = e.target.value;
                              }}
                              min={new Date().toISOString().slice(0, 16)}
                            />
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() =>
                                updateJudgeLink(link.id, link.newExpirationDate)
                              }
                              title="Vista"
                            >
                              ✅
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingLink(null)}
                              title="Hætta við"
                            >
                              ❌
                            </button>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center gap-2">
                            <small>
                              {new Date(link.expires_at).toLocaleString(
                                "is-IS"
                              )}
                            </small>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setEditingLink(link.id)}
                              title="Breyta gildistíma"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            isLinkExpired(link.expires_at)
                              ? "bg-danger"
                              : link.is_used
                              ? "bg-success"
                              : "bg-warning"
                          }`}
                        >
                          {isLinkExpired(link.expires_at)
                            ? "Útrunnin"
                            : link.is_used
                            ? "Notuð"
                            : "Virk"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteJudgeLink(link.id)}
                          title="Eyða slóð"
                        >
                          🗑️
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
  );
}

function RegisterAthletes({ competitionId, goBack }) {
  const [startlist, setStartlist] = useState([]);
  const [activeRound, setActiveRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [availableAthletes, setAvailableAthletes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [competitionTitle, setCompetitionTitle] = useState("");
  const [advancing, setAdvancing] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [results, setResults] = useState([]);

  const sensors = useSensors(useSensor(PointerSensor));

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
      console.log("📋 Startlist data received:", res.data);

      // Add climber_id to athletes if missing
      const processedData = res.data.map((category) => ({
        ...category,
        rounds: category.rounds.map((round) => ({
          ...round,
          athletes: round.athletes.map((athlete) => ({
            ...athlete,
            climber_id: athlete.climber_id || athlete.id, // Ensure climber_id exists
            id: athlete.id || athlete.climber_id, // Ensure id exists
          })),
        })),
      }));

      console.log("📋 Processed startlist data:", processedData);
      setStartlist(processedData);

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
      console.log("👥 Available athletes:", res.data);
      setAvailableAthletes(res.data);
    } catch (err) {
      console.error("Failed to load athletes:", err);
    }
  };

  const fetchResults = async () => {
    try {
      const res = await api.get(`/scoring/results/full/${competitionId}/`);
      console.log("🏆 Results data:", res.data);
      setResults(res.data);
    } catch (err) {
      console.error("Failed to load results:", err);
    }
  };

  const fetchRounds = async () => {
    try {
      const res = await api.get(
        `/competitions/rounds/?competition_id=${competitionId}`
      );
      console.log("🔄 Rounds data:", res.data);
      setRounds(res.data);
    } catch (err) {
      console.error("Failed to load rounds:", err);
    }
  };

  const handleDragEnd = async (event, categoryName) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    console.log("🔄 Drag ended:", {
      activeId: active.id,
      overId: over.id,
      category: categoryName,
    });

    // Find the category data
    const categoryData = getCategoriesForRound().find(
      (cat) => cat.category === categoryName
    );

    if (!categoryData) {
      console.error("❌ Category not found:", categoryName);
      return;
    }

    const athletes = [...categoryData.athletes];
    console.log("👥 Athletes in category before processing:", athletes);

    // Find the indices for the dragged items - try multiple ID strategies
    let oldIndex = -1;
    let newIndex = -1;

    // Strategy 1: Try climber_id
    oldIndex = athletes.findIndex(
      (athlete) => athlete.climber_id?.toString() === active.id?.toString()
    );
    newIndex = athletes.findIndex(
      (athlete) => athlete.climber_id?.toString() === over.id?.toString()
    );

    // Strategy 2: Try id if climber_id didn't work
    if (oldIndex === -1 || newIndex === -1) {
      oldIndex = athletes.findIndex(
        (athlete) => athlete.id?.toString() === active.id?.toString()
      );
      newIndex = athletes.findIndex(
        (athlete) => athlete.id?.toString() === over.id?.toString()
      );
    }

    // Strategy 3: Try start_order as backup
    if (oldIndex === -1 || newIndex === -1) {
      const activeOrder = active.id?.toString().replace("athlete-", "");
      const overOrder = over.id?.toString().replace("athlete-", "");
      oldIndex = athletes.findIndex(
        (athlete) => athlete.start_order?.toString() === activeOrder
      );
      newIndex = athletes.findIndex(
        (athlete) => athlete.start_order?.toString() === overOrder
      );
    }

    console.log("🎯 Found indices:", {
      oldIndex,
      newIndex,
      activeId: active.id,
      overId: over.id,
    });

    if (oldIndex === -1 || newIndex === -1) {
      console.error("❌ Could not find athlete indices", {
        oldIndex,
        newIndex,
        activeId: active.id,
        overId: over.id,
        athleteIds: athletes.map((a) => ({
          climber_id: a.climber_id,
          id: a.id,
          start_order: a.start_order,
        })),
      });
      return;
    }

    console.log(`📍 Moving athlete from position ${oldIndex} to ${newIndex}`);

    // Reorder the athletes
    const reorderedAthletes = arrayMove(athletes, oldIndex, newIndex);

    // Update start orders
    const updatedAthletes = reorderedAthletes.map((athlete, index) => ({
      ...athlete,
      start_order: index + 1,
    }));

    // Show loading state
    setStartlist((prevStartlist) =>
      prevStartlist.map((cat) => {
        if (cat.category === categoryName) {
          return {
            ...cat,
            isReordering: true,
            rounds: cat.rounds.map((round) => {
              if (round.round_name === activeRound) {
                return {
                  ...round,
                  athletes: updatedAthletes,
                };
              }
              return round;
            }),
          };
        }
        return cat;
      })
    );

    try {
      // Prepare payload for backend - ensure we have the right IDs
      const athletesPayload = updatedAthletes.map((athlete, index) => {
        const climberId = athlete.climber_id || athlete.id;
        console.log(`🏃‍♂️ Athlete ${index + 1}:`, {
          name: athlete.full_name,
          climber_id: climberId,
          start_order: index + 1,
        });

        if (!climberId) {
          console.error("❌ Missing climber_id for athlete:", athlete);
        }

        return {
          climber_id: climberId,
          start_order: index + 1,
        };
      });

      const payload = {
        competition: parseInt(competitionId),
        category: categoryName,
        round: activeRound,
        athletes: athletesPayload,
      };

      console.log("📤 Sending payload to backend:", payload);

      // Send the updated order to the backend
      const response = await api.post(
        "/competitions/update-start-order/",
        payload
      );

      console.log("✅ Start order updated successfully:", response.data);
    } catch (err) {
      console.error(
        "❌ Failed to update start order:",
        err.response?.data || err
      );
      console.error("❌ Full error object:", err);

      // Revert the local state and show error
      await fetchStartlist();

      let errorMsg = "Ekki tókst að uppfæra röðun";
      if (err.response?.data?.detail) {
        errorMsg += `: ${err.response.data.detail}`;
      } else if (err.response?.data?.errors) {
        errorMsg += `: ${err.response.data.errors.join(", ")}`;
      }

      alert(errorMsg);
    } finally {
      // Remove loading state
      setStartlist((prevStartlist) =>
        prevStartlist.map((cat) => {
          if (cat.category === categoryName) {
            return {
              ...cat,
              isReordering: false,
            };
          }
          return cat;
        })
      );
    }
  };

  const handleAdvanceClimbers = async (categoryName, currentRoundName) => {
    console.log(
      "🚀 Advancing climbers from:",
      currentRoundName,
      "in category:",
      categoryName
    );

    const categoryRounds = rounds
      .filter((round) => {
        if (
          !round?.competition_category_detail?.category_group_detail?.name ||
          !round?.competition_category_detail?.gender
        ) {
          return false;
        }
        const roundCategoryName = `${round.competition_category_detail.category_group_detail.name} ${round.competition_category_detail.gender}`;
        return roundCategoryName === categoryName;
      })
      .sort((a, b) => a.round_order - b.round_order);

    console.log("🔍 Category rounds found:", categoryRounds);

    const currentRoundIndex = categoryRounds.findIndex(
      (r) => r.round_group_detail?.name === currentRoundName
    );

    if (currentRoundIndex === -1) {
      alert("Gat ekki fundið núverandi umferð.");
      return;
    }

    const currentRound = categoryRounds[currentRoundIndex];
    const nextRound = categoryRounds[currentRoundIndex + 1];

    if (!nextRound) {
      alert("Engin næsta umferð til að flytja í.");
      return;
    }

    console.log("➡️ Advancing FROM round:", currentRound.id, currentRoundName);
    console.log(
      "➡️ Advancing TO round:",
      nextRound.id,
      nextRound.round_group_detail.name
    );

    try {
      setAdvancing(`${categoryName}-${currentRoundName}`);

      const response = await api.post(`/scoring/advance/${currentRound.id}/`);

      if (response.data.status === "ok") {
        const message = `✅ Tókst að flytja ${response.data.advanced} keppendur úr ${currentRoundName} í ${nextRound.round_group_detail.name}!`;
        console.log("✅ SUCCESS:", message);
        alert(message);

        await fetchStartlist();
        await fetchResults();

        console.log("🔄 Data refreshed after advancing climbers");
      } else {
        const errorMsg = `Villa: ${response.data.message || "Óþekkt villa"}`;
        console.error("❌ Advance failed:", response.data);
        alert(errorMsg);
      }
    } catch (err) {
      console.error("❌ ERROR during advance:", err);
      const errorMessage =
        err.response?.data?.detail || "Ekki tókst að flytja keppendur.";
      alert(`Villa: ${errorMessage}`);
    } finally {
      setAdvancing(null);
    }
  };

  const handleRemoveAthlete = async (athlete, category) => {
    console.log("🗑️ Removing athlete", athlete.full_name, "from", category);

    try {
      const payload = {
        competition: competitionId,
        category: category,
        round: activeRound,
        start_order: athlete.start_order,
      };

      console.log("📤 Remove payload:", payload);

      const res = await api.post("/competitions/remove-athlete/", payload);

      console.log(`✅ ${athlete.full_name} removed from ${category}`);
      await fetchStartlist();
    } catch (err) {
      console.error("❌ Failed to remove athlete:", err.response?.data || err);
      alert(
        `Ekki tókst að fjarlægja keppanda: ${
          err.response?.data?.detail || err.message
        }`
      );
    }
  };

  const handleAddAthlete = (category) => {
    console.log("➕ Adding athlete to category:", category);
    setSelectedCategory(category);
    setShowAddModal(true);
    setSearchQuery("");
  };

  const handleSelectAthlete = async (athlete) => {
    if (!selectedCategory || !activeRound) return;

    console.log(
      "🎯 Selecting athlete:",
      athlete.user_account?.full_name,
      "for category:",
      selectedCategory
    );

    try {
      const payload = {
        competition: competitionId,
        category: selectedCategory,
        round: activeRound,
        climber: athlete.id,
      };

      console.log("📤 Register athlete payload:", payload);

      const response = await api.post(
        "/competitions/register-athlete/",
        payload
      );

      console.log("✅ Athlete registered:", response.data);
      await fetchStartlist();
      setShowAddModal(false);
    } catch (err) {
      console.error(
        "❌ Failed to register athlete:",
        err.response?.data || err
      );
      alert(
        `Ekki tókst að skrá keppanda: ${
          err.response?.data?.detail || err.message
        }`
      );
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
          ? {
              category: cat.category,
              athletes: round.athletes || [],
              roundData: round,
              isReordering: cat.isReordering || false,
            }
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
    const categoryResults = results.find((r) => {
      if (!r.category || !r.category.group) {
        return false;
      }

      const resultCategoryName = `${r.category.group.name} ${r.category.gender}`;
      return resultCategoryName === categoryName;
    });

    if (!categoryResults || !categoryResults.rounds) {
      return false;
    }

    const roundResults = categoryResults.rounds.find((r) => {
      return r.round_name === roundName;
    });

    if (!roundResults || !roundResults.results) {
      return false;
    }

    return roundResults.results.length > 0;
  };

  const getNextRoundForCategory = (categoryName, currentRoundName) => {
    const categoryRounds = rounds
      .filter((round) => {
        if (
          !round?.competition_category_detail?.category_group_detail?.name ||
          !round?.competition_category_detail?.gender
        ) {
          return false;
        }

        const roundCategoryName = `${round.competition_category_detail.category_group_detail.name} ${round.competition_category_detail.gender}`;
        return roundCategoryName === categoryName;
      })
      .sort((a, b) => a.round_order - b.round_order);

    const currentRoundIndex = categoryRounds.findIndex(
      (r) => r.round_group_detail?.name === currentRoundName
    );

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
          const hasCurrentResults = hasResultsForRound(
            cat.category,
            activeRound
          );
          const showAdvanceButton = nextRound && hasCurrentResults;

          return (
            <div key={idx} className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">{cat.category}</h5>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleAddAthlete(cat.category)}
                      disabled={cat.isReordering}
                    >
                      + Keppandi
                    </button>
                    {showAdvanceButton && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() =>
                          handleAdvanceClimbers(cat.category, activeRound)
                        }
                        disabled={isAdvancing || cat.isReordering}
                        title={`Flytja bestu keppendur úr ${activeRound} í ${nextRound.round_group_detail.name}`}
                      >
                        {isAdvancing
                          ? "Flyti..."
                          : `Flytja í ${nextRound.round_group_detail.name}`}
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
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) =>
                          handleDragEnd(event, cat.category)
                        }
                      >
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th style={{ width: "30px" }}></th>
                              <th>Nr.</th>
                              <th>Nafn</th>
                              <th>Flokkur</th>
                              <th>Kyn</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            <SortableContext
                              items={cat.athletes.map(
                                (athlete, i) =>
                                  athlete.climber_id ||
                                  athlete.id ||
                                  `athlete-${i}`
                              )}
                              strategy={verticalListSortingStrategy}
                            >
                              {cat.athletes.map((athlete, i) => (
                                <SortableAthleteRow
                                  key={
                                    athlete.climber_id ||
                                    athlete.id ||
                                    `athlete-${i}`
                                  }
                                  athlete={athlete}
                                  index={i}
                                  isReordering={cat.isReordering}
                                  onRemove={(athlete) =>
                                    handleRemoveAthlete(athlete, cat.category)
                                  }
                                />
                              ))}
                            </SortableContext>
                          </tbody>
                        </table>
                      </DndContext>
                    </div>
                  )}
                </div>
                {showAdvanceButton && (
                  <div className="card-footer">
                    <small className="text-muted">
                      Flytur úr: {activeRound} →{" "}
                      {nextRound.round_group_detail.name}
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

      {/* Judge Link Section - Moved to bottom */}
      <JudgeLinkSection competitionId={competitionId} />

      <div className="alert alert-info mt-4">
        <strong>Athugið:</strong> Til að nota "Flytja" takkann þarf að vera
        búinn að skrá niðurstöður fyrir núverandi umferð. Kerfið flytur
        sjálfkrafa bestu keppendur út frá stigagjöf í næstu umferð.
        <br />
        <strong>Röðun:</strong> Dragðu og slepptu keppendum til að breyta
        ráslista röðun.
      </div>
    </div>
  );
}

export default RegisterAthletes;
