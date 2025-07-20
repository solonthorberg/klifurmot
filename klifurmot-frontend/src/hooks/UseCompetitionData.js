import { useEffect, useState } from "react";
import {
  fetchCompetition,
  fetchCategories,
  fetchRounds,
  createCompetition,
  updateCompetition,
  uploadImage,
} from "../components/CompetitionManage/CompetitionAPI";
import {
  generateKey,
  reorderList,
} from "../components/CompetitionManage/CompetitionUtils";

export function useCompetitionData({ competitionId, goBack }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState({
    title: "",
    startDate: "",
    endDate: "",
    location: "",
    description: "",
    visible: true,
    image: null,
    currentImageUrl: "",
    showCategoryModal: false,
    isEditMode: !!competitionId,
  });

  const [categoryState, setCategoryState] = useState([]);

  useEffect(() => {
    if (competitionId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [competitionId]);

  const loadData = async () => {
    try {
      const competition = await fetchCompetition(competitionId);
      const cats = await fetchCategories(competitionId);
      const rounds = await fetchRounds(competitionId);

      setFormState((prev) => ({
        ...prev,
        title: competition.title || "",
        startDate: competition.start_date?.slice(0, 16) || "",
        endDate: competition.end_date?.slice(0, 16) || "",
        location: competition.location || "",
        description: competition.description || "",
        visible: competition.visible,
        currentImageUrl: competition.image || "",
      }));

      const processed = [];

      for (const cat of cats) {
        const catKey = generateKey();
        const catRounds = rounds
          .filter((r) => r.competition_category_detail?.id === cat.id)
          .sort((a, b) => a.round_order - b.round_order)
          .map((r) => ({
            _id: generateKey(),
            existingId: r.id,
            name: r.round_group_detail?.name || "Ónefnd umferð",
            athlete_count: r.climbers_advance || r.max_athletes || 0,
            boulder_count: r.boulder_count || 0,
            markedForDeletion: false,
          }));

        processed.push({
          key: catKey,
          existingId: cat.id,
          name: `${cat.category_group_detail.name} ${cat.gender}`,
          markedForDeletion: false,
          rounds: catRounds,
          roundsModal: false,
          roundToEdit: null,
        });
      }

      setCategoryState(processed);
    } catch (err) {
      setError("Gat ekki sótt gögn.");
    } finally {
      setLoading(false);
    }
  };

  const setFormField = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const setImage = (file) => {
    setFormState((prev) => ({ ...prev, image: file }));
  };

  const setShowCategoryModal = (val) => {
    setFormState((prev) => ({ ...prev, showCategoryModal: val }));
  };

  const handleAddCategory = (categoryLabel) => {
    const key = generateKey();
    const newCategory = {
      key,
      name: categoryLabel,
      markedForDeletion: false,
      rounds: [],
      roundsModal: false,
      roundToEdit: null,
    };
    setCategoryState((prev) => [...prev, newCategory]);
    setShowCategoryModal(false);
  };

  const handleAddOrUpdateRound = (catKey, round, mode) => {
    setCategoryState((prev) =>
      prev.map((cat) => {
        if (cat.key !== catKey) return cat;
        if (mode === "open") {
          return { ...cat, roundsModal: true, roundToEdit: null };
        }
        if (mode === "close") {
          return { ...cat, roundsModal: false, roundToEdit: null };
        }
        if (mode === "save") {
          if (round._id) {
            return {
              ...cat,
              rounds: cat.rounds.map((r) => (r._id === round._id ? round : r)),
              roundsModal: false,
              roundToEdit: null,
            };
          } else {
            return {
              ...cat,
              rounds: [...cat.rounds, round],
              roundsModal: false,
              roundToEdit: null,
            };
          }
        }
        return { ...cat, roundsModal: true, roundToEdit: round };
      })
    );
  };

  const handleDeleteCategory = (catKey) => {
    setCategoryState((prev) =>
      prev.map((cat) =>
        cat.key === catKey ? { ...cat, markedForDeletion: true } : cat
      )
    );
  };

  const handleDeleteRound = (catKey, roundIndex) => {
    setCategoryState((prev) =>
      prev.map((cat) =>
        cat.key === catKey
          ? {
              ...cat,
              rounds: cat.rounds.map((r, i) =>
                i === roundIndex ? { ...r, markedForDeletion: true } : r
              ),
            }
          : cat
      )
    );
  };

  const handleDragRound = (catKey, event) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    setCategoryState((prev) =>
      prev.map((cat) => {
        if (cat.key !== catKey) return cat;
        const filtered = cat.rounds.filter((r) => !r.markedForDeletion);
        const oldIndex = filtered.findIndex((r) => r._id === active.id);
        const newIndex = filtered.findIndex((r) => r._id === over.id);
        const reordered = reorderList(filtered, oldIndex, newIndex);
        const merged = reordered.concat(
          cat.rounds.filter((r) => r.markedForDeletion)
        );
        return { ...cat, rounds: merged };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const {
        title,
        startDate,
        endDate,
        location,
        description,
        visible,
        image,
      } = formState;

      if (!title || !startDate || !endDate || !location) {
        setError("Vinsamlegast fylltu út alla nauðsynlega reiti.");
        setSubmitting(false);
        return;
      }

      const payload = {
        title,
        start_date: startDate,
        end_date: endDate,
        location,
        description,
        visible,
      };

      let imageUrl = formState.currentImageUrl;

      if (image) {
        const formData = new FormData();
        formData.append("file", image);
        imageUrl = await uploadImage(formData);
      }

      if (imageUrl) {
        payload.image = imageUrl;
      }

      let competition = null;

      if (competitionId) {
        competition = await updateCompetition(competitionId, payload);
      } else {
        competition = await createCompetition(payload);
      }

      const competition_id = competition.id;

      for (const cat of categoryState) {
        if (cat.markedForDeletion && cat.existingId) {
          await fetch(`/api/competition-categories/${cat.existingId}/`, {
            method: "DELETE",
          });
          continue;
        }

        if (cat.markedForDeletion && !cat.existingId) continue;

        let catId = cat.existingId;
        if (!catId) {
          const res = await fetch("/api/competition-categories/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              competition: competition_id,
              label: cat.name,
            }),
          });
          const newCat = await res.json();
          catId = newCat.id;
        }

        const validRounds = cat.rounds;

        for (let i = 0; i < validRounds.length; i++) {
          const r = validRounds[i];

          if (r.markedForDeletion && r.existingId) {
            await fetch(`/api/rounds/${r.existingId}/`, {
              method: "DELETE",
            });
            continue;
          }

          if (r.markedForDeletion && !r.existingId) continue;

          const roundPayload = {
            competition_category: catId,
            round_group: r.name,
            max_athletes: r.athlete_count,
            boulder_count: r.boulder_count,
            round_order: i + 1,
          };

          if (r.existingId) {
            await fetch(`/api/rounds/${r.existingId}/`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(roundPayload),
            });
          } else {
            await fetch(`/api/rounds/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(roundPayload),
            });
          }
        }
      }

      goBack();
    } catch (err) {
      setError("Ekki tókst að vista mótið.");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formState,
    categoryState,
    loading,
    submitting,
    error,
    setFormField,
    setImage,
    setShowCategoryModal,
    setError,
    handleAddCategory,
    handleAddOrUpdateRound,
    handleDeleteCategory,
    handleDeleteRound,
    handleDragRound,
    handleSubmit,
  };
}
