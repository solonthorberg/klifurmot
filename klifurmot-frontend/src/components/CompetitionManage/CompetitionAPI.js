import api from "../../services/api";

export async function fetchCompetition(id) {
  const res = await api.get(`/competitions/competitions/${id}/`);
  return res.data;
}

export async function fetchCategories(competitionId) {
  const res = await api.get(
    `/competitions/competition-categories/?competition_id=${competitionId}`
  );
  return res.data;
}

export async function fetchRounds(competitionId) {
  const res = await api.get(
    `/competitions/rounds/?competition_id=${competitionId}`
  );
  return res.data;
}

export async function createCompetition(payload) {
  const res = await api.post("/competitions/competitions/", payload);
  return res.data;
}

export async function updateCompetition(id, payload) {
  const res = await api.patch(`/competitions/competitions/${id}/`, payload);
  return res.data;
}

export async function uploadImage(formData) {
  const res = await api.post("/competitions/upload_image/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data.image_url;
}
