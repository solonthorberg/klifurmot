import { useState, useEffect } from "react";
import api from "../services/api";
import CategoryModal from "./CategoryModal";
import RoundModal from "./RoundModal";
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
import SortableItem from "./SortableItem";

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
        console.log("🔍 Fetching competition data for ID:", competitionId);

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

        // Fetch existing rounds for this competition (which contain category info)
        console.log("Fetching rounds for competition...");
        const roundsResponse = await api.get(
          `/competitions/rounds/?competition_id=${competitionId}`
        );
        console.log("Rounds response:", roundsResponse.data);
        console.log(
          "First round structure:",
          JSON.stringify(roundsResponse.data[0], null, 2)
        );

        // Group by category_group and build data structure
        const categoryGroups = {};
        roundsResponse.data.forEach((round) => {
          console.log("Processing round:", round);

          const categoryDetail = round.competition_category_detail;
          if (!categoryDetail) {
            console.warn(" Round missing category detail:", round);
            return;
          }

          const groupKey = categoryDetail.category_group;
          const groupName =
            categoryDetail.category_group_detail?.name ||
            `Category ${groupKey}`;

          console.log(`Group key: ${groupKey}, Group name: ${groupName}`);

          if (!categoryGroups[groupKey]) {
            categoryGroups[groupKey] = {
              id: groupKey,
              name: groupName,
              key: `${groupKey}-${Date.now()}-${Math.random()}`,
              rounds: [],
              roundsModal: false,
              roundToEdit: null,
              existingCategories: [], // Track unique categories
            };
            console.log(`Created new category group: ${groupName}`);
          }

          // Add unique categories to track
          const existingCat = categoryGroups[groupKey].existingCategories.find(
            (cat) => cat.id === categoryDetail.id
          );
          if (!existingCat) {
            categoryGroups[groupKey].existingCategories.push(categoryDetail);
          }
        });

        console.log("📊 Category groups created:", categoryGroups);

        // Process rounds for each category group
        for (const group of Object.values(categoryGroups)) {
          try {
            console.log(
              `🔍 Processing rounds for category group: ${group.name}...`
            );

            // Filter rounds for this specific category group and remove duplicates
            const seenRoundGroups = new Set();
            const categoryRounds = roundsResponse.data.filter((round) => {
              // Check if this round belongs to this category group
              const belongsToGroup =
                round.competition_category_detail?.category_group === group.id;

              if (!belongsToGroup) return false;

              // Handle round_group data
              const roundGroupData = round.round_group_detail;
              if (!roundGroupData) {
                console.warn(
                  ` Round ${round.id} missing round_group_detail:`,
                  round
                );
                return false;
              }

              // Avoid duplicates by checking if we've already seen this round_group
              const roundGroupKey = `${roundGroupData.id}-${round.round_order}`;
              if (seenRoundGroups.has(roundGroupKey)) {
                return false;
              }
              seenRoundGroups.add(roundGroupKey);

              return true;
            });

            // Sort by round_order to maintain proper sequence
            const sortedRounds = categoryRounds.sort(
              (a, b) => a.round_order - b.round_order
            );

            group.rounds = sortedRounds.map((round, idx) => {
              const roundGroupData = round.round_group_detail;
              return {
                id: roundGroupData.id,
                name: roundGroupData.name,
                athlete_count: round.climbers_advance || 0,
                boulder_count: round.boulder_count || 0,
                _id: `existing-${round.id}-${idx}`,
                roundId: round.id,
                order: round.round_order,
                round_group_id: roundGroupData.id,
              };
            });

            console.log(
              ` Processed ${group.rounds.length} valid rounds for ${group.name}:`,
              group.rounds
            );
          } catch (err) {
            console.warn(
              ` Error processing rounds for category group ${group.name}:`,
              err.response?.data || err.message
            );
          }
        }

        const finalCategories = Object.values(categoryGroups);
        console.log(" Final categories with rounds:", finalCategories);
        setCategories(finalCategories);
      } catch (err) {
        console.error(" Error fetching competition:", err);
        setError("Ekki tókst að sækja mótsupplýsingar");
      } finally {
        setLoading(false);
      }
    };

    fetchCompetition();
  }, [isEditMode, competitionId]);

  const handleAddCategory = (categoryGroup) => {
    const newCategory = {
      ...categoryGroup,
      key: `${categoryGroup.id}-${Date.now()}-${Math.random()}`,
      rounds: [],
      roundsModal: false,
      roundToEdit: null,
    };
    console.log("➕ Added category", newCategory);
    setCategories((prev) => [...prev, newCategory]);
    setShowCategoryModal(false);
  };

  const handleAddOrUpdateRound = async (categoryKey, round) => {
    console.log(" Adding or updating round", round);

    const category = categories.find((cat) => cat.key === categoryKey);
    const editing = category?.roundToEdit;

    // If we're editing an existing round from the database
    if (editing && editing.roundId && isEditMode) {
      try {
        console.log("📝 Updating existing round in database:", editing.roundId);
        const updateData = {
          round_group: round.round_group_id || round.id,
          climbers_advance: parseInt(round.athlete_count) || 0,
          boulder_count: parseInt(round.boulder_count) || 0,
        };

        await api.patch(`/competitions/rounds/${editing.roundId}/`, updateData);
        console.log(" Successfully updated round in database");
      } catch (err) {
        console.error(" Failed to update round in database:", err);
        setError("Ekki tókst að uppfæra umferð í gagnagrunn");
        return;
      }
    }

    // Update local state
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.key !== categoryKey) return cat;
        const updatedRounds = [...cat.rounds];

        if (editing && typeof editing.index === "number") {
          // Update existing round
          updatedRounds[editing.index] = {
            ...round,
            _id: editing._id, // Keep the same _id for consistency
            roundId: editing.roundId, // Keep the database ID if it exists
          };
        } else {
          // Add new round
          if (!round._id) round._id = `${Date.now()}-${Math.random()}`;
          updatedRounds.push(round);
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

  const handleDeleteCategory = async (categoryKey) => {
    const categoryToDelete = categories.find(cat => cat.key === categoryKey);
    
    // If this is an existing category in edit mode, we need to delete it from the database
    if (isEditMode && categoryToDelete?.existingCategories?.length > 0) {
      try {
        // Delete all existing categories (both KK and KVK) for this category group
        for (const existingCategory of categoryToDelete.existingCategories) {
          try {
            await api.delete(`/competitions/competition-categories/${existingCategory.id}/`);
          } catch (err) {
            console.error(`Failed to delete category ${existingCategory.id}:`, err);
            // Continue trying to delete other categories even if one fails
          }
        }
        
        // Also delete any rounds that might still exist
        for (const round of categoryToDelete.rounds) {
          if (round.roundId) {
            try {
              await api.delete(`/competitions/rounds/${round.roundId}/`);
            } catch (err) {
              console.error(`Failed to delete round ${round.roundId}:`, err);
              // Continue with deletion even if some rounds fail
            }
          }
        }
      } catch (err) {
        console.error("Failed to delete category from database:", err);
        setError(`Ekki tókst að eyða flokki úr gagnagrunni: ${err.response?.data?.detail || err.message}`);
        return; // Don't remove from local state if database deletion failed
      }
    }

    // Remove from local state
    setCategories((prev) => prev.filter((cat) => cat.key !== categoryKey));
  };

  const handleDeleteRound = async (categoryKey, roundIndex) => {
    const category = categories.find((cat) => cat.key === categoryKey);
    const roundToDelete = category?.rounds[roundIndex];

    if (!roundToDelete) {
      console.error("Round not found for deletion");
      return;
    }

    // If this is an existing round from the database, we need to delete it via API
    if (roundToDelete.roundId && isEditMode) {
      try {
        await api.delete(`/competitions/rounds/${roundToDelete.roundId}/`);
      } catch (err) {
        console.error("Failed to delete round from database:", err);
        setError("Ekki tókst að eyða umferð úr gagnagrunni");
        return;
      }
    }

    // Remove from local state
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.key !== categoryKey) return cat;
        const updatedRounds = [...cat.rounds];
        updatedRounds.splice(roundIndex, 1);
        return { ...cat, rounds: updatedRounds };
      })
    );
  };

  const handleRoundDragEnd = (categoryKey, event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    console.log(" Reordering rounds:", {
      activeId: active.id,
      overId: over.id,
    });
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

  const createCategoriesAndRounds = async (competitionId) => {
    try {
      for (const category of categories) {
        // Skip if this category already exists in the database (for edit mode)
        if (
          category.existingCategories &&
          category.existingCategories.length > 0
        ) {
          console.log("Skipping existing category:", category.name);
          // Note: Updates to existing rounds are handled individually in handleAddOrUpdateRound
          continue;
        }

        // Create categories for both genders (only for new categories)
        const genders = ["KK", "KVK"];

        for (const gender of genders) {
          // Create competition category
          const categoryData = {
            competition: competitionId,
            category_group: category.id,
            gender: gender,
          };

          console.log("📤 Creating category with data:", categoryData);

          try {
            const categoryResponse = await api.post(
              "/competitions/competition-categories/",
              categoryData
            );

            const createdCategoryId = categoryResponse.data.id;
            console.log(" Created category:", categoryResponse.data);

            // Create rounds for this category (only new rounds without roundId)
            for (let i = 0; i < category.rounds.length; i++) {
              const round = category.rounds[i];

              // Skip rounds that already exist in the database
              if (round.roundId) {
                console.log("Skipping existing round:", round.name);
                continue;
              }

              const roundData = {
                competition_category: createdCategoryId,
                round_group: round.round_group_id || round.id,
                round_order: i + 1,
                climbers_advance: parseInt(round.athlete_count) || 0,
                boulder_count: parseInt(round.boulder_count) || 0,
              };

              console.log("📤 Creating round with data:", roundData);

              try {
                const roundResponse = await api.post(
                  "/competitions/rounds/",
                  roundData
                );
                console.log(" Created round:", roundResponse.data);
              } catch (roundErr) {
                console.error(" Failed to create round:", roundErr);
                throw new Error(
                  roundErr.response?.data?.detail ||
                    JSON.stringify(roundErr.response?.data) ||
                    "Failed to create round"
                );
              }
            }
          } catch (catErr) {
            console.error(" Failed to create category:", catErr);
            throw new Error(
              catErr.response?.data?.detail ||
                JSON.stringify(catErr.response?.data) ||
                "Failed to create category"
            );
          }
        }
      }
    } catch (err) {
      console.error(" Failed to create categories and rounds:", err);
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
      // Validate required fields
      if (!title.trim() || !startDate || !endDate || !location.trim()) {
        throw new Error("Please fill in all required fields");
      }

      if (new Date(startDate) >= new Date(endDate)) {
        throw new Error("End date must be after start date");
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

      console.log(`📤 ${isEditMode ? "Updating" : "Creating"} competition...`);

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

      console.log(
        ` Competition ${isEditMode ? "updated" : "created"} successfully:`,
        response.data
      );

      // Create new categories and rounds if they exist (only for new ones)
      if (categories.length > 0) {
        console.log("📝 Creating/updating categories and rounds...");
        await createCategoriesAndRounds(response.data.id);
      }

      await refreshCompetitions();
      goBack();
    } catch (err) {
      console.error(
        ` Failed to ${isEditMode ? "update" : "create"} competition:`,
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

          {categories.length > 0 && (
            <div>
              {categories.map((cat) => (
                <div
                  key={cat.key}
                  style={{
                    border: "1px solid #ddd",
                    padding: "1rem",
                    margin: "1rem 0",
                    borderRadius: "4px",
                    backgroundColor: "#f8f9fa",
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
                      <button
                        type="button"
                        onClick={() => {
                          console.log(
                            "🟢 Opening round modal for category:",
                            cat.name
                          );
                          setCategories((prev) =>
                            prev.map((c) =>
                              c.key === cat.key
                                ? { ...c, roundsModal: true, roundToEdit: null }
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
                          handleDeleteCategory(cat.key);
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
                    </div>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleRoundDragEnd(cat.key, event)}
                  >
                    <SortableContext
                      items={cat.rounds.map((r) => r._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div>
                        {cat.rounds.length === 0 ? (
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
                                backgroundColor: "white",
                                borderRadius: "4px",
                              }}
                            >
                              <SortableItem id={round._id}>
                                <span>
                                  {round.name} – {round.athlete_count} keppendur
                                  – {round.boulder_count} leiðir
                                </span>
                              </SortableItem>
                              <div style={{ display: "flex", gap: "0.25rem" }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    console.log("✏️ Editing round:", round);
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
                                    handleDeleteRound(cat.key, idx);
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
                            </div>
                          ))
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {cat.roundsModal && (
                    <RoundModal
                      existingRound={cat.roundToEdit}
                      onClose={() => {
                        console.log("🔴 Closing round modal for:", cat.name);
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

          {categories.length === 0 && (
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