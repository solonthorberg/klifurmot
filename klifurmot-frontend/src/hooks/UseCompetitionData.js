import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export function useCompetitionData({ competitionId }) {
  const navigate = useNavigate();
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
      setLoading(true);
      setError(null);

      const [competition, cats, rounds] = await Promise.all([
        fetchCompetition(competitionId),
        fetchCategories(competitionId),
        fetchRounds(competitionId),
      ]);

      // Update form state
      setFormState((prev) => ({
        ...prev,
        title: competition.title || "",
        startDate: competition.start_date?.slice(0, 16) || "",
        endDate: competition.end_date?.slice(0, 16) || "",
        location: competition.location || "",
        description: competition.description || "",
        visible: competition.visible ?? true,
        currentImageUrl: competition.image || "",
      }));

      // Process categories and rounds
      const processedCategories = cats.map((cat) => {
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

        return {
          key: catKey,
          existingId: cat.id,
          name: `${cat.category_group_detail.name} ${cat.gender}`,
          markedForDeletion: false,
          rounds: catRounds,
          roundsModal: false,
          roundToEdit: null,
        };
      });

      setCategoryState(processedCategories);
    } catch (err) {
      console.error("Error loading competition data:", err);
      setError("Gat ekki sótt gögn fyrir mótið.");
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

  const handleAddCategory = (categoryData) => {
    const key = generateKey();
    const newCategory = {
      key,
      name: categoryData.name || categoryData,
      categoryGroupId: categoryData.id,
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

        switch (mode) {
          case "open":
            return { ...cat, roundsModal: true, roundToEdit: null };
          case "close":
            return { ...cat, roundsModal: false, roundToEdit: null };
          case "edit":
            return { ...cat, roundsModal: true, roundToEdit: round };
          case "save":
            if (round._id && cat.rounds.find((r) => r._id === round._id)) {
              // Update existing round
              return {
                ...cat,
                rounds: cat.rounds.map((r) =>
                  r._id === round._id ? round : r
                ),
                roundsModal: false,
                roundToEdit: null,
              };
            } else {
              // Add new round
              const newRound = { ...round, _id: round._id || generateKey() };
              return {
                ...cat,
                rounds: [...cat.rounds, newRound],
                roundsModal: false,
                roundToEdit: null,
              };
            }
          default:
            return cat;
        }
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

        const activeRounds = cat.rounds.filter((r) => !r.markedForDeletion);
        const oldIndex = activeRounds.findIndex((r) => r._id === active.id);
        const newIndex = activeRounds.findIndex((r) => r._id === over.id);

        if (oldIndex === -1 || newIndex === -1) return cat;

        const reorderedRounds = reorderList(activeRounds, oldIndex, newIndex);
        const deletedRounds = cat.rounds.filter((r) => r.markedForDeletion);

        return { ...cat, rounds: [...reorderedRounds, ...deletedRounds] };
      })
    );
  };

  const validateForm = () => {
    const { title, startDate, endDate, location } = formState;

    if (!title?.trim()) {
      throw new Error("Titill er nauðsynlegur");
    }
    if (!startDate) {
      throw new Error("Byrjunardagur er nauðsynlegur");
    }
    if (!endDate) {
      throw new Error("Lokadagur er nauðsynlegur");
    }
    if (!location?.trim()) {
      throw new Error("Staðsetning er nauðsynleg");
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw new Error("Lokadagur verður að vera eftir byrjunardag");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validate form
      validateForm();

      const {
        title,
        startDate,
        endDate,
        location,
        description,
        visible,
        image,
      } = formState;

      // Prepare competition payload
      const competitionPayload = {
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        location: location.trim(),
        description: description?.trim() || "",
        visible,
      };

      // Handle image upload if needed
      if (image) {
        try {
          const formData = new FormData();
          formData.append("file", image);
          const imageUrl = await uploadImage(formData);
          competitionPayload.image = imageUrl;
        } catch (imageError) {
          console.error("Image upload failed:", imageError);
          throw new Error("Ekki tókst að hlaða upp mynd");
        }
      } else if (formState.currentImageUrl) {
        competitionPayload.image = formState.currentImageUrl;
      }

      // Create or update competition
      let competition;
      if (competitionId) {
        competition = await updateCompetition(
          competitionId,
          competitionPayload
        );
      } else {
        competition = await createCompetition(competitionPayload);
      }

      // Process categories and rounds
      await processCategoriesAndRounds(competition.id);

      // Success - navigate back
      navigate(-1);
    } catch (err) {
      console.error("Competition save error:", err);
      setError(err.message || "Ekki tókst að vista mótið.");
    } finally {
      setSubmitting(false);
    }
  };

  const processCategoriesAndRounds = async (competitionId) => {
    const categoriesToProcess = categoryState.filter(
      (cat) => !cat.markedForDeletion
    );
    const categoriesToDelete = categoryState.filter(
      (cat) => cat.markedForDeletion && cat.existingId
    );

    // Delete marked categories
    for (const cat of categoriesToDelete) {
      try {
        await api.delete(
          `/competitions/competition-categories/${cat.existingId}/`
        );
      } catch (err) {
        console.warn(`Failed to delete category ${cat.existingId}:`, err);
      }
    }

    // Process each category
    for (const cat of categoriesToProcess) {
      try {
        let categoryId = cat.existingId;

        // Create new category if needed
        if (!categoryId) {
          const categoryResponse = await api.post(
            "/competitions/competition-categories/",
            {
              competition: competitionId,
              category_group: cat.categoryGroupId,
              gender: extractGenderFromName(cat.name),
            }
          );
          categoryId = categoryResponse.data.id;
        }

        // Process rounds for this category
        await processRoundsForCategory(categoryId, cat.rounds);
      } catch (err) {
        console.error(`Failed to process category ${cat.name}:`, err);
        throw new Error(`Ekki tókst að vinna með flokk: ${cat.name}`);
      }
    }
  };

  const processRoundsForCategory = async (categoryId, rounds) => {
    const roundsToProcess = rounds.filter((r) => !r.markedForDeletion);
    const roundsToDelete = rounds.filter(
      (r) => r.markedForDeletion && r.existingId
    );

    // Delete marked rounds
    for (const round of roundsToDelete) {
      try {
        await api.delete(`/competitions/rounds/${round.existingId}/`);
      } catch (err) {
        console.warn(`Failed to delete round ${round.existingId}:`, err);
      }
    }

    // Process remaining rounds
    for (let i = 0; i < roundsToProcess.length; i++) {
      const round = roundsToProcess[i];

      const roundPayload = {
        competition_category: categoryId,
        round_group:
          round.roundGroupId || (await findOrCreateRoundGroup(round.name)),
        max_athletes: parseInt(round.athlete_count) || 0,
        boulder_count: parseInt(round.boulder_count) || 0,
        round_order: i + 1,
      };

      try {
        if (round.existingId) {
          await api.patch(
            `/competitions/rounds/${round.existingId}/`,
            roundPayload
          );
        } else {
          await api.post("/competitions/rounds/", roundPayload);
        }
      } catch (err) {
        console.error(`Failed to process round ${round.name}:`, err);
        throw new Error(`Ekki tókst að vinna með umferð: ${round.name}`);
      }
    }
  };

  const findOrCreateRoundGroup = async (roundName) => {
    try {
      // First try to find existing round group
      const response = await api.get("/competitions/round-groups/");
      const existingGroup = response.data.find(
        (group) => group.name.toLowerCase() === roundName.toLowerCase()
      );

      if (existingGroup) {
        return existingGroup.id;
      }

      // Create new round group if not found
      const newGroupResponse = await api.post("/competitions/round-groups/", {
        name: roundName,
      });

      return newGroupResponse.data.id;
    } catch (err) {
      console.error("Failed to find/create round group:", err);
      throw new Error(`Ekki tókst að búa til umferðarflokk: ${roundName}`);
    }
  };

  const extractGenderFromName = (categoryName) => {
    // Extract gender from category name like "U15 Male" -> "Male"
    const parts = categoryName.split(" ");
    const lastPart = parts[parts.length - 1];
    return ["Male", "Female", "Karlar", "Konur"].includes(lastPart)
      ? lastPart
      : "Mixed";
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
