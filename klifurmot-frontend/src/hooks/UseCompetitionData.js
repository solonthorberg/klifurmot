import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
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
  const isEditMode = !!competitionId;
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

      // Process categories and rounds - group by category_group
      const categoryMap = {};

      // First, create category groups from categories
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
      if (rounds.length > 0) {
        // Group rounds by category_group and round details to get unique rounds
        const roundsByCategory = {};

        rounds.forEach((round) => {
          const categoryDetail = round.competition_category_detail;
          if (!categoryDetail) return;

          const groupId = categoryDetail.category_group;

          if (!roundsByCategory[groupId]) {
            roundsByCategory[groupId] = [];
          }

          // Check if we already have this round (same round_group and round_order)
          const existingRound = roundsByCategory[groupId].find(
            (r) =>
              r.round_group_detail?.id === round.round_group_detail?.id &&
              r.round_order === round.round_order
          );

          if (!existingRound) {
            roundsByCategory[groupId].push(round);
          }
        });

        // Add processed rounds to categories
        Object.keys(roundsByCategory).forEach((groupId) => {
          if (categoryMap[groupId]) {
            const categoryRounds = roundsByCategory[groupId];

            // Sort by round order
            categoryRounds.sort((a, b) => a.round_order - b.round_order);

            categoryMap[groupId].rounds = categoryRounds.map((round, idx) => ({
              round_group_id: round.round_group_detail?.id,
              name: round.round_group_detail?.name,
              athlete_count: round.climbers_advance || round.max_athletes || 0,
              boulder_count: round.boulder_count || 0,
              _id: `existing-${round.id}-${idx}`,
              roundId: round.id, // This is the actual database round ID
              order: round.round_order,
              markedForDeletion: false,
              modified: false, // Mark as not modified when loading from database
            }));
          }
        });
      }

      const categoryArray = Object.values(categoryMap);
      setCategoryState(categoryArray);
    } catch (err) {
      console.error("Error loading competition data:", err);
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
    if (!category) return; // Safety check

    // Check if category already exists
    const existingCategory = categoryState.find(
      (cat) => cat.id === category.categoryGroupId && !cat.markedForDeletion
    );
    if (existingCategory) {
      setError(`Flokkur "${category.name}" er nú þegar til`);
      setTimeout(() => setError(""), 3000);
      return;
    }

    const newCategory = {
      id: category.categoryGroupId, // Use the category group ID
      name: category.name,
      key: `${category.categoryGroupId}-${Date.now()}-${Math.random()}`,
      rounds: [],
      roundsModal: false,
      roundToEdit: null,
      markedForDeletion: false,
    };
    setCategoryState((prev) => [...prev, newCategory]);
    setFormState((prev) => ({ ...prev, showCategoryModal: false }));
  };

  const handleAddOrUpdateRound = async (categoryKey, round, action) => {
    if (action === "open") {
      // Open modal for adding new round
      setCategoryState((prev) =>
        prev.map((cat) =>
          cat.key === categoryKey
            ? { ...cat, roundsModal: true, roundToEdit: null }
            : cat
        )
      );
    } else if (action === "edit") {
      // Open modal for editing existing round - need to find the index
      setCategoryState((prev) =>
        prev.map((cat) => {
          if (cat.key === categoryKey) {
            const roundIndex = cat.rounds.findIndex((r) => r._id === round._id);
            const roundWithIndex = { ...round, index: roundIndex };
            return { ...cat, roundsModal: true, roundToEdit: roundWithIndex };
          }
          return cat;
        })
      );
    } else if (action === "save" && round) {
      const category = categoryState.find((cat) => cat.key === categoryKey);
      const editing = category?.roundToEdit;

      console.log("🔧 ROUND SAVE ACTION:");
      console.log("- Category:", category?.name);
      console.log("- Editing round:", editing);
      console.log("- New round data:", round);
      console.log(
        "- Is editing existing?",
        editing && typeof editing.index === "number"
      );

      // Update the UI state only - no database updates until final save
      setCategoryState((prev) =>
        prev.map((cat) => {
          if (cat.key !== categoryKey) return cat;
          const updatedRounds = [...cat.rounds];

          if (editing && typeof editing.index === "number") {
            // Updating existing round - mark as modified for database update later
            console.log("📝 Updating existing round at index:", editing.index);
            console.log("- Old round:", updatedRounds[editing.index]);

            updatedRounds[editing.index] = {
              ...round,
              _id: editing._id,
              roundId: editing.roundId,
              markedForDeletion: false,
              modified: true, // Mark as modified so it gets updated in database
            };

            console.log("- New round:", updatedRounds[editing.index]);
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
    } else if (action === "close") {
      // Close modal without saving
      setCategoryState((prev) =>
        prev.map((cat) =>
          cat.key === categoryKey
            ? { ...cat, roundsModal: false, roundToEdit: null }
            : cat
        )
      );
    }
  };

  const handleDeleteCategory = (categoryKey) => {
    setCategoryState((prev) =>
      prev.map((cat) =>
        cat && cat.key === categoryKey
          ? { ...cat, markedForDeletion: true }
          : cat
      )
    );
  };

  const handleDeleteRound = (categoryKey, roundId) => {
    console.log("🗑️ DELETE ROUND ACTION:");
    console.log("- Category Key:", categoryKey);
    console.log("- Round ID:", roundId);

    setCategoryState((prev) =>
      prev.map((cat) => {
        if (cat && cat.key === categoryKey) {
          console.log("- Found category:", cat.name);
          console.log("- Rounds before delete:", cat.rounds);

          const updatedRounds = cat.rounds.map((round) => {
            if (round && round._id === roundId) {
              console.log("- Marking round for deletion:", round);
              return { ...round, markedForDeletion: true };
            }
            return round;
          });

          console.log("- Rounds after delete:", updatedRounds);

          return {
            ...cat,
            rounds: updatedRounds,
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
        if (cat && cat.key === categoryKey) {
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

      // Prepare competition payload
      const competitionPayload = {
        title: formState.title,
        start_date: formState.startDate,
        end_date: formState.endDate,
        location: formState.location,
        description: formState.description,
        visible: formState.visible,
      };

      // Handle image upload
      const { image } = formState;
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

      // ✅ REMOVED: Don't reload data after successful save - just navigate away
      // This was causing deleted rounds to reappear
      // if (competitionId) {
      //   await loadData();
      // }

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
    try {
      console.log("🎯 PROCESSING CATEGORIES AND ROUNDS:");
      console.log("- Competition ID:", competitionId);
      console.log("- All categories:", categoryState);

      // Filter categories
      const categoriesToProcess = categoryState.filter(
        (cat) => cat && !cat.markedForDeletion
      );
      const categoriesToDelete = categoryState.filter(
        (cat) => cat && cat.markedForDeletion && cat.existingCategories
      );

      console.log("📋 Categories to process:", categoriesToProcess.length);
      console.log("🗑️ Categories to delete:", categoriesToDelete.length);

      // Delete marked categories first
      for (const cat of categoriesToDelete) {
        try {
          // Delete all existing competition categories for this category group
          for (const existingCategory of cat.existingCategories) {
            await api.delete(
              `/competitions/competition-categories/${existingCategory.id}/`
            );
            console.log(`✅ Deleted category: ${existingCategory.id}`);
          }
        } catch (err) {
          console.warn(`Failed to delete category ${cat.name}:`, err);
        }
      }

      // Process remaining categories
      for (const category of categoriesToProcess) {
        console.log("🔄 Processing category:", category.name);
        console.log(
          "- Has existing categories?",
          !!category.existingCategories
        );

        // Handle existing categories - create new rounds and update existing ones
        if (
          category.existingCategories &&
          category.existingCategories.length > 0
        ) {
          console.log(`✅ Processing existing category: ${category.name}`);

          // For each existing competition category, process its rounds
          for (const existingCategory of category.existingCategories) {
            await processRoundsForCategory(
              existingCategory.id,
              category.rounds
            );
          }
        } else {
          // Handle completely new categories - Create both KK and KVK
          console.log(`Creating new category: ${category.name}`);
          const genders = ["KK", "KVK"];

          for (const gender of genders) {
            const categoryData = {
              competition: competitionId,
              category_group: category.id,
              gender: gender,
            };

            console.log("📤 Creating category:", categoryData);

            try {
              const categoryResponse = await api.post(
                "/competitions/competition-categories/",
                categoryData
              );

              const createdCategoryId = categoryResponse.data.id;
              console.log("✅ Created new category:", categoryResponse.data);

              // Process rounds for this new category
              await processRoundsForCategory(
                createdCategoryId,
                category.rounds
              );
            } catch (catErr) {
              console.error("Failed to create new category:", catErr);
              console.error("Error details:", catErr.response?.data);

              // Provide more detailed error message
              if (catErr.response?.data) {
                const errorDetails = Object.entries(catErr.response.data)
                  .map(
                    ([key, value]) =>
                      `${key}: ${
                        Array.isArray(value) ? value.join(", ") : value
                      }`
                  )
                  .join("; ");
                throw new Error(
                  `Ekki tókst að búa til flokk ${category.name} (${gender}): ${errorDetails}`
                );
              }

              throw new Error(
                `Ekki tókst að búa til flokk ${category.name} (${gender})`
              );
            }
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

  // ✅ FIXED: processRoundsForCategory function with improved error handling
  const processRoundsForCategory = async (categoryId, rounds) => {
    console.log("🔄 Processing rounds for category:", categoryId);
    console.log("- Total rounds:", rounds.length);

    const roundsToProcess = rounds.filter((r) => !r.markedForDeletion);
    const roundsToDelete = rounds.filter(
      (r) => r.markedForDeletion && r.roundId // ✅ Using correct property
    );

    console.log("📋 Rounds to process:", roundsToProcess.length);
    console.log("🗑️ Rounds to delete:", roundsToDelete.length);

    // Delete marked rounds first with improved error handling
    for (const round of roundsToDelete) {
      try {
        console.log(`🗑️ Deleting round: ${round.roundId}`);

        // Optional: Check if round exists first to prevent 404
        try {
          await api.get(`/competitions/rounds/${round.roundId}/`);
          // Round exists, proceed with deletion
          await api.delete(`/competitions/rounds/${round.roundId}/`);
          console.log(`✅ Successfully deleted round: ${round.roundId}`);
        } catch (checkErr) {
          if (checkErr.response?.status === 404) {
            console.log(
              `ℹ️ Round ${round.roundId} already deleted or doesn't exist`
            );
            // This is fine - round was already deleted
          } else {
            // Re-throw if it's not a 404 error
            throw checkErr;
          }
        }
      } catch (err) {
        console.warn(`Failed to delete round ${round.roundId}:`, err);
        // Continue processing other rounds even if one fails
      }
    }

    // Process remaining rounds (create new ones and update existing ones)
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

      console.log("📤 Round payload:", roundPayload);

      try {
        if (round.roundId && round.modified) {
          // Update existing round
          console.log(`📝 Updating existing round: ${round.roundId}`);
          const updateResponse = await api.patch(
            `/competitions/rounds/${round.roundId}/`,
            roundPayload
          );
          console.log("✅ Updated round:", updateResponse.data);
        } else if (!round.roundId) {
          // Create new round
          console.log("➕ Creating new round");
          const createResponse = await api.post(
            "/competitions/rounds/",
            roundPayload
          );
          console.log("✅ Created round:", createResponse.data);
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
        (group) =>
          group &&
          group.name &&
          group.name.toLowerCase() === roundName.toLowerCase()
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
