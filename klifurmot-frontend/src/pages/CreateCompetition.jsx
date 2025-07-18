import { useState, useEffect } from "react";
import api from "../services/api";
import CategoryModal from "../components/CategoryModal";
import RoundModal from "../components/RoundModal";
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
import SortableItem from "../components/SortableItem";

function CreateCompetition({
  goBack,
  refreshCompetitions,
  competitionId = null,
}) {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [visible, setVisible] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));
  const isEditMode = !!competitionId;

  // Load existing competition data if in edit mode
  useEffect(() => {
    const fetchCompetition = async () => {
      if (!isEditMode) return;

      setLoading(true);
      try {
        // Fetch competition basic data
        const response = await api.get(
          `/competitions/competitions/${competitionId}/`
        );
        const comp = response.data;

        setTitle(comp.title || "");
        setCurrentImageUrl(comp.image || "");
        setStartDate(comp.start_date ? comp.start_date.slice(0, 16) : "");
        setEndDate(comp.end_date ? comp.end_date.slice(0, 16) : "");
        setLocation(comp.location || "");
        setDescription(comp.description || "");
        setVisible(comp.visible || false);

        // Fetch categories
        const categoriesResponse = await api.get(
          `/competitions/competition-categories/?competition_id=${competitionId}`
        );
        console.log("📋 Categories response:", categoriesResponse.data);

        // Fetch rounds
        const roundsResponse = await api.get(
          `/competitions/rounds/?competition_id=${competitionId}`
        );
        console.log("📋 Rounds response:", roundsResponse.data);

        // Process categories and rounds
        const categoryMap = {};

        // First, create category groups from categories
        categoriesResponse.data.forEach((category) => {
          const groupId = category.category_group;
          const groupName = category.category_group_detail?.name || `Category ${groupId}`;

          if (!categoryMap[groupId]) {
            categoryMap[groupId] = {
              id: groupId,
              name: groupName,
              key: `cat-${groupId}-${Date.now()}`,
              rounds: [],
              roundsModal: false,
              roundToEdit: null,
              existingCategories: [category],
              markedForDeletion: false,
            };
          } else {
            categoryMap[groupId].existingCategories.push(category);
          }
        });

        // Then, add rounds to their respective categories
        if (roundsResponse.data.length > 0) {
          // Group rounds by category_group and round details to get unique rounds
          const roundsByCategory = {};
          
          roundsResponse.data.forEach((round) => {
            const categoryDetail = round.competition_category_detail;
            if (!categoryDetail) return;
            
            const groupId = categoryDetail.category_group;
            
            if (!roundsByCategory[groupId]) {
              roundsByCategory[groupId] = [];
            }
            
            // Check if we already have this round (same round_group and round_order)
            const existingRound = roundsByCategory[groupId].find(r => 
              r.round_group_detail?.id === round.round_group_detail?.id && 
              r.round_order === round.round_order
            );
            
            if (!existingRound) {
              roundsByCategory[groupId].push(round);
            }
          });

          // Add processed rounds to categories
          Object.keys(roundsByCategory).forEach(groupId => {
            if (categoryMap[groupId]) {
              const rounds = roundsByCategory[groupId];
              
              // Sort by round order
              rounds.sort((a, b) => a.round_order - b.round_order);
              
              categoryMap[groupId].rounds = rounds.map((round, idx) => ({
                round_group_id: round.round_group_detail?.id,
                name: round.round_group_detail?.name,
                athlete_count: round.climbers_advance || 0,
                boulder_count: round.boulder_count || 0,
                _id: `existing-${round.id}-${idx}`,
                roundId: round.id, // This is the actual database round ID
                order: round.round_order,
                markedForDeletion: false,
              }));
              
              console.log(`✅ Added ${categoryMap[groupId].rounds.length} rounds to ${categoryMap[groupId].name}`);
            }
          });
        }

        const categoryArray = Object.values(categoryMap);
        console.log("🏁 Final categories:", categoryArray);
        setCategories(categoryArray);

      } catch (err) {
        console.error("Error fetching competition:", err);
        setError("Ekki tókst að sækja mótsupplýsingar");
      } finally {
        setLoading(false);
      }
    };

    fetchCompetition();
  }, [isEditMode, competitionId]);

  const handleAddCategory = (categoryGroup) => {
    const existingCategory = categories.find(
      (cat) => cat.id === categoryGroup.id && !cat.markedForDeletion
    );
    if (existingCategory) {
      setError(`Flokkur "${categoryGroup.name}" er nú þegar til`);
      setTimeout(() => setError(""), 3000);
      return;
    }

    const newCategory = {
      ...categoryGroup,
      key: `${categoryGroup.id}-${Date.now()}-${Math.random()}`,
      rounds: [],
      roundsModal: false,
      roundToEdit: null,
      markedForDeletion: false,
    };
    setCategories((prev) => [...prev, newCategory]);
    setShowCategoryModal(false);
  };

  const handleAddOrUpdateRound = async (categoryKey, round) => {
    const category = categories.find((cat) => cat.key === categoryKey);
    const editing = category?.roundToEdit;

    if (editing && editing.roundId && isEditMode) {
      try {
        const updateData = {
          round_group: round.round_group_id || round.id,
          climbers_advance: parseInt(round.athlete_count) || 0,
          boulder_count: parseInt(round.boulder_count) || 0,
        };

        // Get all rounds for this competition to find related rounds
        const roundsResponse = await api.get(
          `/competitions/rounds/?competition_id=${competitionId}`
        );

        // Find the current round data
        const currentRoundData = roundsResponse.data.find(
          (r) => r.id === editing.roundId
        );

        if (currentRoundData) {
          // Find all related rounds (same category group, round group, and round order)
          // This includes both male and female versions
          const relatedRounds = roundsResponse.data.filter(
            (r) =>
              r.competition_category_detail?.category_group ===
                currentRoundData.competition_category_detail?.category_group &&
              r.round_group_detail?.id ===
                currentRoundData.round_group_detail?.id &&
              r.round_order === currentRoundData.round_order
          );

          console.log(`📝 Updating ${relatedRounds.length} related rounds (both male and female)`);

          // Update all related rounds
          for (const relatedRound of relatedRounds) {
            try {
              await api.patch(`/competitions/rounds/${relatedRound.id}/`, updateData);
              console.log(`✅ Successfully updated round ID ${relatedRound.id}`);
            } catch (err) {
              console.error(`❌ Failed to update round ID ${relatedRound.id}:`, err);
              throw new Error(`Failed to update round: ${err.response?.data?.detail || err.message}`);
            }
          }
        } else {
          // Fallback: just update the single round if we can't find related ones
          await api.patch(`/competitions/rounds/${editing.roundId}/`, updateData);
          console.log("✅ Successfully updated single round in database");
        }
      } catch (err) {
        console.error("Failed to update round:", err);
        setError("Ekki tókst að uppfæra umferð í gagnagrunn");
        return;
      }
    }

    // Update the UI state
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.key !== categoryKey) return cat;
        const updatedRounds = [...cat.rounds];

        if (editing && typeof editing.index === "number") {
          // Updating existing round
          updatedRounds[editing.index] = {
            ...round,
            _id: editing._id,
            roundId: editing.roundId,
            markedForDeletion: false,
          };
        } else {
          // Adding new round
          const newRound = {
            ...round,
            _id: `new-${Date.now()}-${Math.random()}`, // Mark as new with 'new-' prefix
            roundId: null, // Explicitly mark as not saved yet
            markedForDeletion: false,
          };
          updatedRounds.push(newRound);
          console.log("➕ Added new round to category:", newRound);
        }

        return {
          ...cat,
          rounds: updatedRounds,
          roundsModal: false,
          roundToEdit: null,
        };
      })
    );
  };

  const handleMarkCategoryForDeletion = (categoryKey) => {
    if (!confirm("Ertu viss um að þú viljir eyða þessum flokki?")) {
      return;
    }

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.key !== categoryKey) return cat;

        // Mark category for deletion
        const updatedCategory = { ...cat, markedForDeletion: true };

        // Also mark all rounds in this category for deletion
        updatedCategory.rounds = cat.rounds.map((round) => ({
          ...round,
          markedForDeletion: true,
        }));

        return updatedCategory;
      })
    );
  };

  const handleMarkRoundForDeletion = (categoryKey, roundIndex) => {
    if (!confirm("Ertu viss um að þú viljir eyða þessari umferð?")) {
      return;
    }

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.key !== categoryKey) return cat;
        const updatedRounds = [...cat.rounds];
        updatedRounds[roundIndex] = {
          ...updatedRounds[roundIndex],
          markedForDeletion: true,
        };
        return { ...cat, rounds: updatedRounds };
      })
    );
  };

  const handleRoundDragEnd = (categoryKey, event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCategories((prev) => {
      return prev.map((cat) => {
        if (cat.key !== categoryKey) return cat;
        const oldIndex = cat.rounds.findIndex((r) => r._id === active.id);
        const newIndex = cat.rounds.findIndex((r) => r._id === over.id);
        return {
          ...cat,
          rounds: arrayMove(cat.rounds, oldIndex, newIndex),
        };
      });
    });
  };

  const performActualDeletions = async () => {
    // Delete categories and their rounds
    for (const category of categories) {
      if (
        category.markedForDeletion &&
        category.existingCategories?.length > 0
      ) {
        try {
          for (const existingCategory of category.existingCategories) {
            try {
              await api.delete(
                `/competitions/competition-categories/${existingCategory.id}/`
              );
            } catch (err) {
              console.error(
                `Failed to delete category ${existingCategory.id}:`,
                err
              );
            }
          }

          // Delete all rounds in this category
          for (const round of category.rounds) {
            if (round.roundId) {
              try {
                await api.delete(`/competitions/rounds/${round.roundId}/`);
              } catch (err) {
                console.error(`Failed to delete round ${round.roundId}:`, err);
              }
            }
          }
        } catch (err) {
          console.error("Failed to delete category from database:", err);
          throw new Error(
            `Ekki tókst að eyða flokki úr gagnagrunni: ${
              err.response?.data?.detail || err.message
            }`
          );
        }
      } else {
        // Delete individual rounds marked for deletion
        for (const round of category.rounds) {
          if (round.markedForDeletion && round.roundId && isEditMode) {
            try {
              const roundsResponse = await api.get(
                `/competitions/rounds/?competition_id=${competitionId}`
              );

              const currentRoundData = roundsResponse.data.find(
                (r) => r.id === round.roundId
              );

              if (currentRoundData) {
                const relatedRounds = roundsResponse.data.filter(
                  (r) =>
                    r.competition_category_detail?.category_group ===
                      currentRoundData.competition_category_detail
                        ?.category_group &&
                    r.round_group_detail?.id ===
                      currentRoundData.round_group_detail?.id &&
                    r.round_order === currentRoundData.round_order
                );

                for (const relatedRound of relatedRounds) {
                  try {
                    await api.delete(
                      `/competitions/rounds/${relatedRound.id}/`
                    );
                  } catch (deleteErr) {
                    console.error(
                      `Failed to delete round ID ${relatedRound.id}:`,
                      deleteErr
                    );
                  }
                }
              } else {
                await api.delete(`/competitions/rounds/${round.roundId}/`);
              }
            } catch (err) {
              if (err.response?.status !== 404) {
                throw new Error(
                  `Ekki tókst að eyða umferð úr gagnagrunni: ${
                    err.response?.data?.detail || err.message
                  }`
                );
              }
            }
          }
        }
      }
    }
  };

  const createCategoriesAndRounds = async (competitionId) => {
    try {
      // Only process categories that are not marked for deletion
      const activeCategories = categories.filter(
        (cat) => !cat.markedForDeletion
      );

      for (const category of activeCategories) {
        // Handle existing categories - only create new rounds
        if (category.existingCategories && category.existingCategories.length > 0) {
          console.log(`Processing existing category: ${category.name}`);
          
          // Get new rounds that don't have roundId (meaning they weren't saved yet)
          const newRounds = category.rounds.filter(
            (round) => !round.markedForDeletion && !round.roundId
          );
          
          if (newRounds.length > 0) {
            console.log(`Found ${newRounds.length} new rounds for existing category ${category.name}`);
            console.log("New rounds:", newRounds);
            
            // For existing categories, we need to create rounds for each existing competition category
            for (const existingCategory of category.existingCategories) {
              console.log(`Creating rounds for existing category ID: ${existingCategory.id}`);
              
              for (let i = 0; i < newRounds.length; i++) {
                const round = newRounds[i];
                
                // Calculate the round order - get the max existing round order for this category
                const existingRounds = category.rounds.filter(r => r.roundId);
                const maxOrder = existingRounds.length > 0 ? Math.max(...existingRounds.map(r => r.order || 0)) : 0;
                const roundOrder = maxOrder + i + 1;

                const roundData = {
                  competition_category: existingCategory.id,
                  round_group: round.round_group_id,
                  round_order: roundOrder,
                  climbers_advance: parseInt(round.athlete_count) || 0,
                  boulder_count: parseInt(round.boulder_count) || 0,
                };

                console.log("📤 Creating round for existing category:", roundData);

                try {
                  const response = await api.post("/competitions/rounds/", roundData);
                  console.log("✅ Successfully created round for existing category:", response.data);
                } catch (roundErr) {
                  console.error("❌ Failed to create round for existing category:", roundErr);
                  console.error("Error details:", roundErr.response?.data);
                  throw new Error(
                    roundErr.response?.data?.detail || "Failed to create round for existing category"
                  );
                }
              }
            }
          } else {
            console.log(`No new rounds to create for existing category: ${category.name}`);
          }
          continue; // Move to next category
        }

        // Handle completely new categories
        console.log(`Creating new category: ${category.name}`);
        const genders = ["KK", "KVK"];

        for (const gender of genders) {
          const categoryData = {
            competition: competitionId,
            category_group: category.id,
            gender: gender,
          };

          try {
            const categoryResponse = await api.post(
              "/competitions/competition-categories/",
              categoryData
            );

            const createdCategoryId = categoryResponse.data.id;
            console.log("✅ Created new category:", categoryResponse.data);

            // Only create rounds that are not marked for deletion
            const activeRounds = category.rounds.filter(
              (round) => !round.markedForDeletion
            );

            for (let i = 0; i < activeRounds.length; i++) {
              const round = activeRounds[i];

              if (round.roundId) {
                continue; // Skip rounds that already exist
              }

              const roundData = {
                competition_category: createdCategoryId,
                round_group: round.round_group_id || round.id,
                round_order: i + 1,
                climbers_advance: parseInt(round.athlete_count) || 0,
                boulder_count: parseInt(round.boulder_count) || 0,
              };

              console.log("📤 Creating round for new category:", roundData);

              try {
                await api.post("/competitions/rounds/", roundData);
                console.log("✅ Successfully created round for new category");
              } catch (roundErr) {
                console.error("Failed to create round for new category:", roundErr);
                throw new Error(
                  roundErr.response?.data?.detail || "Failed to create round for new category"
                );
              }
            }
          } catch (catErr) {
            console.error("Failed to create new category:", catErr);
            throw new Error(
              catErr.response?.data?.detail || "Failed to create new category"
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to create categories and rounds:", err);
      throw new Error(
        err.message ||
          "Competition saved but failed to create categories/rounds"
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (!title.trim() || !startDate || !endDate || !location.trim()) {
        throw new Error("Please fill in all required fields");
      }

      if (new Date(startDate) >= new Date(endDate)) {
        throw new Error("End date must be after start date");
      }

      // Perform deletions first if in edit mode
      if (isEditMode) {
        await performActualDeletions();
      }

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("start_date", startDate);
      formData.append("end_date", endDate);
      formData.append("location", location.trim());
      formData.append("description", description);
      formData.append("visible", visible);

      if (image) {
        formData.append("image", image);
      }

      let response;
      if (isEditMode) {
        response = await api.patch(
          `/competitions/competitions/${competitionId}/`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      } else {
        response = await api.post("/competitions/competitions/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // Only create categories/rounds that are not marked for deletion
      const activeCategories = categories.filter(
        (cat) => !cat.markedForDeletion
      );
      if (activeCategories.length > 0) {
        await createCategoriesAndRounds(response.data.id);
      }

      await refreshCompetitions();
      goBack();
    } catch (err) {
      console.error(
        `Failed to ${isEditMode ? "update" : "create"} competition:`,
        err
      );
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          `Failed to ${isEditMode ? "update" : "create"} competition`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isEditMode && loading) {
    return <p>Hleður mótsupplýsingum...</p>;
  }

  // Filter out completely deleted categories for display (new categories that were never saved)
  const displayCategories = categories.filter(
    (cat) => !(cat.markedForDeletion && !cat.existingCategories?.length)
  );

  return (
    <div style={{ padding: "1rem" }}>
      <button onClick={goBack} disabled={submitting}>
        ← Til baka
      </button>
      <h3>{isEditMode ? `Breyta móti: ${title}` : "Búa til nýtt mót"}</h3>

      {error && (
        <div
          style={{
            color: "red",
            marginBottom: "1rem",
            padding: "0.5rem",
            border: "1px solid red",
            borderRadius: "4px",
            backgroundColor: "#ffebee",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Titill: *
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter competition title"
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.25rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Mynd:
            {isEditMode && currentImageUrl && (
              <div style={{ marginBottom: "0.5rem" }}>
                <img
                  src={currentImageUrl}
                  alt="Current competition image"
                  style={{
                    width: "200px",
                    height: "120px",
                    objectFit: "cover",
                    borderRadius: "4px",
                  }}
                />
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#666",
                    margin: "0.25rem 0",
                  }}
                >
                  Núverandi mynd
                </p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.25rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            {image && (
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#333",
                  margin: "0.25rem 0",
                }}
              >
                Ný mynd valin: {image.name}
              </p>
            )}
          </label>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              Byrjunardag: *
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              Lokadagur: *
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </label>
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Staðsetning: *
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.25rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Lýsing:
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              rows={4}
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.25rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                resize: "vertical",
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Birta keppni á vefsíðu
          </label>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h4>Flokkar og Umferðir</h4>
            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              disabled={submitting}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              + Flokkur
            </button>
          </div>

          {displayCategories.length > 0 && (
            <div>
              {displayCategories.map((cat) => (
                <div
                  key={cat.key}
                  style={{
                    border: "1px solid #ddd",
                    padding: "1rem",
                    margin: "1rem 0",
                    borderRadius: "4px",
                    backgroundColor: cat.markedForDeletion
                      ? "#ffe6e6"
                      : "#f8f9fa",
                    opacity: cat.markedForDeletion ? 0.7 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <h5 style={{ margin: 0 }}>{cat.name}</h5>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {cat.markedForDeletion ? (
                        <span style={{ color: "red", fontStyle: "italic" }}>
                          Verður eytt þegar þú vistar
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCategories((prev) =>
                                prev.map((c) =>
                                  c.key === cat.key
                                    ? {
                                        ...c,
                                        roundsModal: true,
                                        roundToEdit: null,
                                      }
                                    : c
                                )
                              );
                            }}
                            disabled={submitting}
                            style={{
                              padding: "0.25rem 0.5rem",
                              backgroundColor: "#007bff",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: submitting ? "not-allowed" : "pointer",
                            }}
                          >
                            + Umferð
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleMarkCategoryForDeletion(cat.key);
                            }}
                            disabled={submitting}
                            style={{
                              padding: "0.25rem 0.5rem",
                              backgroundColor: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: submitting ? "not-allowed" : "pointer",
                            }}
                          >
                            🗑️ Eyða flokki
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {!cat.markedForDeletion && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleRoundDragEnd(cat.key, event)}
                    >
                      <SortableContext
                        items={cat.rounds
                          .filter((r) => !r.markedForDeletion)
                          .map((r) => r._id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div>
                          {cat.rounds.filter((r) => !r.markedForDeletion)
                            .length === 0 ? (
                            <p style={{ color: "#666", fontStyle: "italic" }}>
                              Engar umferðir búnar til
                            </p>
                          ) : (
                            cat.rounds.map((round, idx) => (
                              <div
                                key={round._id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "0.5rem",
                                  border: "1px solid #eee",
                                  margin: "0.5rem 0",
                                  backgroundColor: round.markedForDeletion
                                    ? "#ffe6e6"
                                    : "white",
                                  borderRadius: "4px",
                                  opacity: round.markedForDeletion ? 0.7 : 1,
                                }}
                              >
                                {round.markedForDeletion ? (
                                  <span style={{ color: "red" }}>
                                    {round.name} – {round.athlete_count}{" "}
                                    keppendur – {round.boulder_count} leiðir
                                    <span
                                      style={{
                                        fontSize: "0.8rem",
                                        fontStyle: "italic",
                                        marginLeft: "1rem",
                                      }}
                                    >
                                      Verður eytt þegar þú vistar
                                    </span>
                                  </span>
                                ) : (
                                  <>
                                    <SortableItem id={round._id}>
                                      <span>
                                        {round.name} – {round.athlete_count}{" "}
                                        keppendur – {round.boulder_count} leiðir
                                      </span>
                                    </SortableItem>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "0.25rem",
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setCategories((prev) =>
                                            prev.map((c) =>
                                              c.key === cat.key
                                                ? {
                                                    ...c,
                                                    roundsModal: true,
                                                    roundToEdit: {
                                                      ...round,
                                                      index: idx,
                                                    },
                                                  }
                                                : c
                                            )
                                          );
                                        }}
                                        disabled={submitting}
                                        style={{
                                          padding: "0.25rem 0.5rem",
                                          backgroundColor: "#ffc107",
                                          color: "black",
                                          border: "none",
                                          borderRadius: "4px",
                                          cursor: submitting
                                            ? "not-allowed"
                                            : "pointer",
                                          fontSize: "0.875rem",
                                        }}
                                      >
                                        Breyta
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          handleMarkRoundForDeletion(
                                            cat.key,
                                            idx
                                          );
                                        }}
                                        disabled={submitting}
                                        style={{
                                          padding: "0.25rem 0.5rem",
                                          backgroundColor: "#dc3545",
                                          color: "white",
                                          border: "none",
                                          borderRadius: "4px",
                                          cursor: submitting
                                            ? "not-allowed"
                                            : "pointer",
                                          fontSize: "0.875rem",
                                        }}
                                      >
                                        Eyða
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {cat.markedForDeletion && (
                    <div
                      style={{
                        color: "#666",
                        fontStyle: "italic",
                        padding: "1rem",
                      }}
                    >
                      Þessi flokkur og allar umferðir hans verða eyddar þegar þú
                      vistar breytingarnar.
                    </div>
                  )}

                  {cat.roundsModal && !cat.markedForDeletion && (
                    <RoundModal
                      existingRound={cat.roundToEdit}
                      onClose={() => {
                        setCategories((prev) =>
                          prev.map((c) =>
                            c.key === cat.key
                              ? { ...c, roundsModal: false, roundToEdit: null }
                              : c
                          )
                        );
                      }}
                      onSelectRound={(round) =>
                        handleAddOrUpdateRound(cat.key, round)
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {displayCategories.length === 0 && (
            <p
              style={{
                fontStyle: "italic",
                color: "#666",
                textAlign: "center",
                padding: "2rem",
              }}
            >
              Engir flokkar skráðir. Smelltu á "+ Flokkur" til að byrja.
            </p>
          )}
        </div>

        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1rem",
            borderTop: "1px solid #ddd",
          }}
        >
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              backgroundColor: submitting ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: submitting ? "not-allowed" : "pointer",
              marginRight: "1rem",
            }}
          >
            {submitting
              ? isEditMode
                ? "Vista breytingar..."
                : "Vista mót..."
              : isEditMode
              ? "Vista breytingar"
              : "Vista mót"}
          </button>
          <button
            type="button"
            onClick={goBack}
            disabled={submitting}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Hætta við
          </button>
        </div>
      </form>

      {showCategoryModal && (
        <CategoryModal
          show={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSelectCategory={handleAddCategory}
        />
      )}
    </div>
  );
}

export default CreateCompetition;