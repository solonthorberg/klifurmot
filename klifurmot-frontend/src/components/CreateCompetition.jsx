import { useState } from "react";
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

function CreateCompetition({ goBack, refreshCompetitions }) {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [visible, setVisible] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sensors = useSensors(useSensor(PointerSensor));

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

  const handleAddOrUpdateRound = (categoryKey, round) => {
    console.log("✅ Adding or updating round", round);
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.key !== categoryKey) return cat;
        const updatedRounds = [...cat.rounds];
        const editing = cat.roundToEdit;
        if (editing && typeof editing.index === "number") {
          updatedRounds[editing.index] = round;
        } else {
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

  const handleRoundDragEnd = (categoryKey, event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    console.log("🔄 Reordering rounds:", {
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
        // Create categories for both genders
        const genders = ["KK", "KVK"];

        for (const gender of genders) {
          // Create competition category
          const categoryData = {
            competition: competitionId,
            category_group: category.id,
            gender: gender,
          };

          console.log("Creating category:", categoryData);
          const categoryResponse = await api.post(
            "/competitions/competition-categories/",
            categoryData
          );

          const createdCategoryId = categoryResponse.data.id;
          console.log("✅ Created category:", createdCategoryId);

          // Create rounds for this category
          for (let i = 0; i < category.rounds.length; i++) {
            const round = category.rounds[i];
            const roundData = {
              competition_category: createdCategoryId,
              round_group: round.round_group_id, // Use the correct field name
              round_order: i + 1,
              climbers_advance: parseInt(round.athlete_count) || 0,
              boulder_count: parseInt(round.boulder_count) || 0,
            };

            console.log("Creating round:", roundData);
            const roundResponse = await api.post(
              "/competitions/rounds/",
              roundData
            );
            console.log("✅ Created round:", roundResponse.data);
            console.log("🧗 Boulders will be auto-created by Django signal");

            // 🎉 No need to manually create boulders - Django signal handles it!
          }
        }
      }
    } catch (err) {
      console.error("❌ Failed to create categories and rounds:", err);
      throw new Error(
        "Competition created but failed to create categories/rounds"
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

      // ✅ Use correct field names that match Django model
      formData.append("title", title.trim());
      formData.append("start_date", startDate);
      formData.append("end_date", endDate);
      formData.append("location", location.trim());
      formData.append("description", description); // Changed from "information"
      formData.append("visible", visible); // Changed from "is_visible"

      if (image) {
        formData.append("image", image);
      }

      console.log("📤 Sending form data:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const response = await api.post("/competitions/competitions/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("✅ Competition created successfully:", response.data);

      // Create categories and rounds if they exist
      if (categories.length > 0) {
        console.log("📝 Creating categories and rounds...");
        await createCategoriesAndRounds(response.data.id);
      }

      await refreshCompetitions();
      goBack();
    } catch (err) {
      console.error("❌ Failed to create competition:", err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Failed to create competition"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <button onClick={goBack} disabled={submitting}>
        ← Til baka
      </button>
      <h3>Búa til nýtt mót</h3>

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

        {/* Categories Display */}
        {categories.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <h4>Flokkar og Umferðir:</h4>
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
                  <button
                    type="button"
                    onClick={() => {
                      console.log("🟢 Opening modal for", cat.name);
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
                        cat.rounds.map((round) => (
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
                                {round.name} – {round.athlete_count} keppendur –{" "}
                                {round.boulder_count} leiðir
                              </span>
                            </SortableItem>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                console.log("✏️ Editing round:", round.name);
                                setCategories((prev) =>
                                  prev.map((c) =>
                                    c.key === cat.key
                                      ? {
                                          ...c,
                                          roundsModal: true,
                                          roundToEdit: {
                                            ...round,
                                            index: cat.rounds.findIndex(
                                              (r) => r._id === round._id
                                            ),
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
                                cursor: submitting ? "not-allowed" : "pointer",
                              }}
                            >
                              Breyta
                            </button>
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
                      console.log("🔴 Closing RoundModal for", cat.name);
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
            }}
          >
            {submitting ? "Vista mót..." : "Vista mót"}
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
