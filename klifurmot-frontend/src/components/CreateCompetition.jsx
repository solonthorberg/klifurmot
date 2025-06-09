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

  const sensors = useSensors(useSensor(PointerSensor));

  const handleAddCategory = (categoryGroup) => {
    const newCategory = {
      ...categoryGroup,
      key: `${categoryGroup.id}-${Date.now()}-${Math.random()}`,
      rounds: [],
      roundsModal: false,
      roundToEdit: null,
    };
    setCategories((prev) => [...prev, newCategory]);
    setShowCategoryModal(false);
  };

  const handleAddOrUpdateRound = (categoryIndex, round) => {
    setCategories((prev) => {
      const updated = [...prev];
      const editing = updated[categoryIndex].roundToEdit;

      if (editing && typeof editing.index === "number") {
        updated[categoryIndex].rounds[editing.index] = round;
      } else {
        if (!round._id) {
          round._id = `${Date.now()}-${Math.random()}`;
        }
        updated[categoryIndex].rounds.push(round);
      }

      updated[categoryIndex].roundsModal = false;
      updated[categoryIndex].roundToEdit = null;
      return updated;
    });
  };

  const handleCategoryDrag = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.key === active.id);
    const newIndex = categories.findIndex((c) => c.key === over.id);
    setCategories(arrayMove(categories, oldIndex, newIndex));
  };

  const handleRoundDrag = (catIdx) => (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCategories((prev) => {
      const updated = [...prev];
      const rounds = updated[catIdx].rounds;
      const oldIndex = rounds.findIndex((r) => r._id === active.id);
      const newIndex = rounds.findIndex((r) => r._id === over.id);
      updated[catIdx].rounds = arrayMove(rounds, oldIndex, newIndex);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", title);
      if (image) formData.append("image", image);
      formData.append("start_date", startDate);
      formData.append("end_date", endDate);
      formData.append("location", location);
      formData.append("information", description);
      formData.append("is_visible", visible);

      await api.post("/competitions/competitions/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await refreshCompetitions();
      goBack();
    } catch (err) {
      console.error("Failed to create competition:", err);
    }
  };

  return (
    <div>
      <button onClick={goBack}>← Til baka</button>
      <h3>Búa til nýtt mót</h3>

      <form onSubmit={handleSubmit}>
        <label>
          Titill:
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Mynd:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
          />
        </label>
        <label>
          Dagsetning:
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <label>
          Staðsetning:
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label>
          Upplýsingar:
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          Birta keppni á vefsíðu
        </label>

        <button type="button" onClick={() => setShowCategoryModal(true)}>
          + Flokkur
        </button>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCategoryDrag}
        >
          <SortableContext
            items={categories.map((c) => c.key)}
            strategy={verticalListSortingStrategy}
          >
            {categories.map((cat, idx) => (
              <div key={cat.key}>
                <SortableItem id={cat.key}>
                  <h4>{cat.name}</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setCategories((prev) =>
                        prev.map((c, i) =>
                          i === idx
                            ? { ...c, roundsModal: true, roundToEdit: null }
                            : c
                        )
                      );
                    }}
                  >
                    + Umferð
                  </button>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleRoundDrag(idx)}
                  >
                    <SortableContext
                      items={cat.rounds.map((r) => r._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul>
                        {cat.rounds.map((round, rIdx) => (
                          <SortableItem key={round._id} id={round._id}>
                            <li
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>
                                {round.name} – {round.athlete_count} keppendur –{" "}
                                {round.boulder_count} leiðir
                              </span>
                              <button
                                onClick={() => {
                                  setCategories((prev) =>
                                    prev.map((c, i) =>
                                      i === idx
                                        ? {
                                            ...c,
                                            roundsModal: true,
                                            roundToEdit: {
                                              ...round,
                                              index: rIdx,
                                            },
                                          }
                                        : c
                                    )
                                  );
                                }}
                              >
                                Breyta
                              </button>
                            </li>
                          </SortableItem>
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                </SortableItem>

                {cat.roundsModal === true && (
                  <RoundModal
                    existingRound={cat.roundToEdit}
                    onClose={() => {
                      setCategories((prev) =>
                        prev.map((c, i) =>
                          i === idx
                            ? { ...c, roundsModal: false, roundToEdit: null }
                            : c
                        )
                      );
                    }}
                    onSelectRound={(round) =>
                      handleAddOrUpdateRound(idx, round)
                    }
                  />
                )}
              </div>
            ))}
          </SortableContext>
        </DndContext>

        <br />
        <button type="submit">Vista mót</button>
      </form>

      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSelectCategory={handleAddCategory}
        />
      )}
    </div>
  );
}

export default CreateCompetition;
