import api from "../../services/api";

export async function fetchCompetition(id) {
  try {
    const res = await api.get(`/competitions/competitions/${id}/`);
    return res.data;
  } catch (error) {
    console.error("Failed to fetch competition:", error);
    throw new Error("Ekki tókst að sækja mótsgögn");
  }
}

export async function fetchCategories(competitionId) {
  try {
    const res = await api.get(
      `/competitions/competition-categories/?competition_id=${competitionId}`
    );
    return res.data;
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    throw new Error("Ekki tókst að sækja flokka");
  }
}

export async function fetchRounds(competitionId) {
  try {
    const res = await api.get(
      `/competitions/rounds/?competition_id=${competitionId}`
    );
    return res.data;
  } catch (error) {
    console.error("Failed to fetch rounds:", error);
    throw new Error("Ekki tókst að sækja umferðir");
  }
}

export async function createCompetition(formData) {
  try {
    const res = await api.post("/competitions/competitions/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    console.error("Failed to create competition:", error);
    throw new Error("Ekki tókst að búa til mót");
  }
}

export async function updateCompetition(id, formData) {
  try {
    const res = await api.patch(`/competitions/competitions/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    console.error("Failed to update competition:", error);
    console.error("Response data:", error.response?.data);
    throw new Error("Ekki tókst að uppfæra mót");
  }
}

export async function uploadImage(imageFile) {
  try {
    const formData = new FormData();
    formData.append("image", imageFile);

    const res = await api.post("/competitions/upload_image/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.image_url;
  } catch (error) {
    console.error("Failed to upload competition image:", error);
    throw new Error("Ekki tókst að hlaða upp keppnismynd");
  }
}

export async function fetchCategoryGroups() {
  try {
    const res = await api.get("/competitions/category-groups/");
    return res.data;
  } catch (error) {
    console.error("Failed to fetch category groups:", error);
    throw new Error("Ekki tókst að sækja flokka");
  }
}

export async function fetchRoundGroups() {
  try {
    const res = await api.get("/competitions/round-groups/");
    return res.data;
  } catch (error) {
    console.error("Failed to fetch round groups:", error);
    throw new Error("Ekki tókst að sækja umferðarflokka");
  }
}
