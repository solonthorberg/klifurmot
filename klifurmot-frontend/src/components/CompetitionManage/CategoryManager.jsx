import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  fetchCompetition,
  fetchCategories,
  fetchRounds,
  createCompetition,
  updateCompetition,
  uploadImage,
} from "../components/CompetitionManage/CompetitionAPI";
import { reorderList } from "../components/CompetitionManage/CompetitionUtils";

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

      const categoryMap = {};
      cats.forEach((category) => {
        const groupId = category.category_group;
        const groupName =
          category.category_group_detail?.name || `Category ${groupId}`;

        if (!categoryMap[groupId]) {
          categoryMap[groupId] = {
            id: groupId,
            name: groupName,
            key: `cat-${groupId}-${Date.now()}`,
            rounds: [],
            existingCategories: [category],
            markedForDeletion: false,
          };
        } else {
          categoryMap[groupId].existingCategories.push(category);
        }
      });

      if (rounds.length > 0) {
        const roundsByCategory = {};
        rounds.forEach((round) => {
          const categoryDetail = round.competition_category_detail;
          if (!categoryDetail) return;

          const groupId = categoryDetail.category_group;
          if (!roundsByCategory[groupId]) {
            roundsByCategory[groupId] = [];
          }

          const existingRound = roundsByCategory[groupId].find(
            (r) =>
              r.round_group_detail?.id === round.round_group_detail?.id &&
              r.round_order === round.round_order
          );

          if (!existingRound) {
            roundsByCategory[groupId].push(round);
          }
        });

        Object.keys(roundsByCategory).forEach((groupId) => {
          if (categoryMap[groupId]) {
            const categoryRounds = roundsByCategory[groupId];
            categoryRounds.sort((a, b) => a.round_order - b.round_order);

            categoryMap[groupId].rounds = categoryRounds.map((round, idx) => ({
              round_group_id: round.round_group_detail?.id,
              name: round.round_group_detail?.name,
              athlete_count: round.climbers_advance || round.max_athletes || 0,
              boulder_count: round.boulder_count || 0,
              _id: `existing-${round.id}-${idx}`,
              roundId: round.id,
              order: round.round_order,
              markedForDeletion: false,
              modified: false,
            }));
          }
        });
      }

      setCategoryState(Object.values(categoryMap));
    } catch (err) {
      setError("Gat ekki sótt gögn fyrir mótið.");
    } finally {
      setLoading(false);
    }
  };

  const setFormField = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const setImage = (image) => {
    setFormState((prev) => ({ ...prev, image }));
  };

  const setShowCategoryModal = (show) => {
    setFormState((prev) => ({ ...prev, showCategoryModal: show }));
  };

  const handleAddCategory = (category) => {
    if (!category) return;

    const existingCategory = categoryState.find(
      (cat) => cat.id === category.categoryGroupId && !cat.markedForDeletion
    );
    if (existingCategory) {
      setError(`Flokkur "${category.name}" er nú þegar til`);
      setTimeout(() => setError(""), 3000);
      return;
    }

    const newCategory = {
      id: category.categoryGroupId,
      name: category.name,
      key: `${category.categoryGroupId}-${Date.now()}-${Math.random()}`,
      rounds: [],
      markedForDeletion: false,
    };
    setCategoryState((prev) => [...prev, newCategory]);
    setFormState((prev) => ({ ...prev, showCategoryModal: false }));
  };

  const handleAddOrUpdateRound = (categoryKey, round, action) => {
    setCategoryState((prev) =>
      prev.map((cat) => {
        if (cat.key !== categoryKey) return cat;

        switch (action) {
          case "save":
            if (!round) return cat;
            const editing = cat.roundToEdit;
            const updatedRounds = [...cat.rounds];

            if (editing && typeof editing.index === "number") {
              updatedRounds[editing.index] = {
                ...round,
                _id: editing._id,
                roundId: editing.roundId,
                markedForDeletion: false,
                modified: true,
              };
            } else {
              updatedRounds.push({
                ...round,
                _id: `new-${Date.now()}-${Math.random()}`,
                roundId: null,
                markedForDeletion: false,
              });
            }

            return {
              ...cat,
              rounds: updatedRounds,
              roundsModal: false,
              roundToEdit: null,
            };

          case "edit":
            const roundIndex = cat.rounds.findIndex((r) => r._id === round._id);
            return {
              ...cat,
              roundsModal: true,
              roundToEdit: { ...round, index: roundIndex },
            };

          case "open":
            return { ...cat, roundsModal: true, roundToEdit: null };

          case "close":
            return { ...cat, roundsModal: false, roundToEdit: null };

          default:
            return cat;
        }
      })
    );
  };

  const handleDeleteCategory = (categoryKey) => {
    setCategoryState((prev) =>
      prev.map((cat) =>
        cat?.key === categoryKey ? { ...cat, markedForDeletion: true } : cat
      )
    );
  };

  const handleDeleteRound = (categoryKey, roundId) => {
    setCategoryState((prev) =>
      prev.map((cat) => {
        if (cat?.key === categoryKey) {
          return {
            ...cat,
            rounds: cat.rounds.map((round) =>
              round?._id === roundId
                ? { ...round, markedForDeletion: true }
                : round
            ),
          };
        }
        return cat;
      })
    );
  };

  const handleDragRound = (categoryKey, result) => {
    if (!result.destination) return;

    setCategoryState((prev) =>
      prev.map((cat) => {
        if (cat?.key === categoryKey) {
          const newRounds = reorderList(
            cat.rounds || [],
            result.source.index,
            result.destination.index
          );
          return { ...cat, rounds: newRounds };
        }
        return cat;
      })
    );
  };

  const validateForm = () => {
    const { title, startDate, endDate, location } = formState;

    if (!title?.trim()) throw new Error("Titill er nauðsynlegur");
    if (!startDate) throw new Error("Byrjunardagur er nauðsynlegur");
    if (!endDate) throw new Error("Lokadagur er nauðsynlegur");
    if (!location?.trim()) throw new Error("Staðsetning er nauðsynleg");
    if (new Date(startDate) >= new Date(endDate)) {
      throw new Error("Lokadagur verður að vera eftir byrjunardag");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      validateForm();

      const competitionPayload = {
        title: formState.title,
        start_date: formState.startDate,
        end_date: formState.endDate,
        location: formState.location,
        description: formState.description,
        visible: formState.visible,
      };

      if (formState.image) {
        const formData = new FormData();
        formData.append("file", formState.image);
        competitionPayload.image = await uploadImage(formData);
      } else if (formState.currentImageUrl) {
        competitionPayload.image = formState.currentImageUrl;
      }

      const competition = competitionId
        ? await updateCompetition(competitionId, competitionPayload)
        : await createCompetition(competitionPayload);

      await processCategoriesAndRounds(competition.id);
      navigate(-1);
    } catch (err) {
      setError(err.message || "Ekki tókst að vista mótið.");
    } finally {
      setSubmitting(false);
    }
  };

  const processCategoriesAndRounds = async (competitionId) => {
    const categoriesToProcess = categoryState.filter(
      (cat) => cat && !cat.markedForDeletion
    );
    const categoriesToDelete = categoryState.filter(
      (cat) => cat?.markedForDeletion && cat.existingCategories
    );

    for (const cat of categoriesToDelete) {
      for (const existingCategory of cat.existingCategories) {
        try {
          await api.delete(
            `/competitions/competition-categories/${existingCategory.id}/`
          );
        } catch (err) {
          console.log(err);
        }
      }
    }

    for (const category of categoriesToProcess) {
      if (category.existingCategories?.length > 0) {
        for (const existingCategory of category.existingCategories) {
          await processRoundsForCategory(existingCategory.id, category.rounds);
        }
      } else {
        const genders = ["KK", "KVK"];
        for (const gender of genders) {
          const categoryData = {
            competition: competitionId,
            category_group: category.id,
            gender: gender,
          };

          const categoryResponse = await api.post(
            "/competitions/competition-categories/",
            categoryData
          );
          await processRoundsForCategory(
            categoryResponse.data.id,
            category.rounds
          );
        }
      }
    }
  };

  const processRoundsForCategory = async (categoryId, rounds) => {
    const roundsToProcess = rounds.filter((r) => !r.markedForDeletion);
    const roundsToDelete = rounds.filter(
      (r) => r.markedForDeletion && r.roundId
    );

    for (const round of roundsToDelete) {
      try {
        await api.delete(`/competitions/rounds/${round.roundId}/`);
      } catch (err) {
        console.log(err);
      }
    }

    for (let i = 0; i < roundsToProcess.length; i++) {
      const round = roundsToProcess[i];
      const roundPayload = {
        competition_category: categoryId,
        round_group:
          round.round_group_id || (await findOrCreateRoundGroup(round.name)),
        max_athletes: parseInt(round.athlete_count) || 0,
        climbers_advance: parseInt(round.athlete_count) || 0,
        boulder_count: parseInt(round.boulder_count) || 0,
        round_order: i + 1,
      };

      if (round.roundId && round.modified) {
        await api.patch(`/competitions/rounds/${round.roundId}/`, roundPayload);
      } else if (!round.roundId) {
        await api.post("/competitions/rounds/", roundPayload);
      }
    }
  };

  const findOrCreateRoundGroup = async (roundName) => {
    const response = await api.get("/competitions/round-groups/");
    const existingGroup = response.data.find(
      (group) => group?.name?.toLowerCase() === roundName.toLowerCase()
    );

    if (existingGroup) return existingGroup.id;

    const newGroupResponse = await api.post("/competitions/round-groups/", {
      name: roundName,
    });
    return newGroupResponse.data.id;
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
