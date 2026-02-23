import { api } from './Client';

import type {
  ApiSuccessResponse,
  Competition,
  CreateCompetitionRequest,
  UpdateCompetitionRequest,
  RoundGroup,
  CategoryGroup,
  CompetitionCategory,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  Round,
  CreateRoundRequest,
  UpdateRoundRequest,
  Boulder,
  UpdateBoulderRequest,
  CompetitionAthletesResponse,
  CategoryBoulders,
  CategoryStartlist,
  CategoryResults,
} from '@/types/Index';

export const competitionsApi = {
  // Competitions
  list: async (): Promise<Competition[]> => {
    const response =
      await api.get<ApiSuccessResponse<Competition[]>>('/competitions/');
    console.log('API response:', response.data);
    return response.data.data;
  },

  get: async (competitionId: number): Promise<Competition> => {
    const response = await api.get<ApiSuccessResponse<Competition>>(
      `/competitions/${competitionId}/`,
    );
    return response.data.data;
  },

  create: async (data: CreateCompetitionRequest): Promise<Competition> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('start_date', data.start_date);
    formData.append('end_date', data.end_date);
    if (data.description) formData.append('description', data.description);
    if (data.location) formData.append('location', data.location);
    if (data.image) formData.append('image', data.image);
    if (data.visible !== undefined)
      formData.append('visible', String(data.visible));

    const response = await api.post<ApiSuccessResponse<Competition>>(
      '/competitions/',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data.data;
  },

  update: async (
    competitionId: number,
    data: UpdateCompetitionRequest,
  ): Promise<Competition> => {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.start_date) formData.append('start_date', data.start_date);
    if (data.end_date) formData.append('end_date', data.end_date);
    if (data.location) formData.append('location', data.location);
    if (data.image) formData.append('image', data.image);
    if (data.visible !== undefined)
      formData.append('visible', String(data.visible));
    if (data.remove_image) formData.append('remove_image', 'true');

    const response = await api.patch<ApiSuccessResponse<Competition>>(
      `/competitions/${competitionId}/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  delete: async (competitionId: number): Promise<void> => {
    await api.delete(`/competitions/${competitionId}/`);
  },

  // Competition nested data
  getAthletes: async (
    competitionId: number,
  ): Promise<CompetitionAthletesResponse> => {
    const response = await api.get<
      ApiSuccessResponse<CompetitionAthletesResponse>
    >(`/competitions/${competitionId}/athletes/`);
    return response.data.data;
  },

  getBoulders: async (competitionId: number): Promise<CategoryBoulders[]> => {
    const response = await api.get<ApiSuccessResponse<CategoryBoulders[]>>(
      `/competitions/${competitionId}/boulders/`,
    );
    return response.data.data;
  },

  getStartlist: async (competitionId: number): Promise<CategoryStartlist[]> => {
    const response = await api.get<ApiSuccessResponse<CategoryStartlist[]>>(
      `/competitions/${competitionId}/startlist/`,
    );
    return response.data.data;
  },

  getResults: async (competitionId: number): Promise<CategoryResults[]> => {
    const response = await api.get<ApiSuccessResponse<CategoryResults[]>>(
      `/competitions/${competitionId}/results/`,
    );
    return response.data.data;
  },

  // Rounds
  listRounds: async (competitionId: number): Promise<Round[]> => {
    const response = await api.get<ApiSuccessResponse<Round[]>>(
      '/competitions/rounds/',
      {
        params: { competition_id: competitionId },
      },
    );
    return response.data.data;
  },

  getRound: async (roundId: number): Promise<Round> => {
    const response = await api.get<ApiSuccessResponse<Round>>(
      `/competitions/rounds/${roundId}/`,
    );
    return response.data.data;
  },

  createRound: async (
    competitionId: number,
    data: CreateRoundRequest,
  ): Promise<Round> => {
    const response = await api.post<ApiSuccessResponse<Round>>(
      `/competitions/${competitionId}/rounds/`,
      data,
    );
    return response.data.data;
  },

  updateRound: async (
    roundId: number,
    data: UpdateRoundRequest,
  ): Promise<Round> => {
    const response = await api.patch<ApiSuccessResponse<Round>>(
      `/competitions/rounds/${roundId}/`,
      data,
    );
    return response.data.data;
  },

  updateRoundStatus: async (
    roundId: number,
    completed: boolean,
  ): Promise<Round> => {
    const response = await api.patch<ApiSuccessResponse<Round>>(
      `/competitions/rounds/${roundId}/status/`,
      { completed },
    );
    return response.data.data;
  },

  deleteRound: async (roundId: number): Promise<void> => {
    await api.delete(`/competitions/rounds/${roundId}/`);
  },

  // Round groups
  listRoundGroups: async (): Promise<RoundGroup[]> => {
    const response = await api.get<ApiSuccessResponse<RoundGroup[]>>(
      '/competitions/round-groups/',
    );
    return response.data.data;
  },

  // Categories
  listCategories: async (
    competitionId: number,
  ): Promise<CompetitionCategory[]> => {
    const response = await api.get<ApiSuccessResponse<CompetitionCategory[]>>(
      '/competitions/categories/',
      { params: { competition_id: competitionId } },
    );
    return response.data.data;
  },

  getCategory: async (categoryId: number): Promise<CompetitionCategory> => {
    const response = await api.get<ApiSuccessResponse<CompetitionCategory>>(
      `/competitions/categories/${categoryId}/`,
    );
    return response.data.data;
  },

  createCategory: async (
    data: CreateCategoryRequest,
  ): Promise<CompetitionCategory> => {
    const response = await api.post<ApiSuccessResponse<CompetitionCategory>>(
      '/competitions/categories/',
      data,
    );
    return response.data.data;
  },

  updateCategory: async (
    categoryId: number,
    data: UpdateCategoryRequest,
  ): Promise<CompetitionCategory> => {
    const response = await api.patch<ApiSuccessResponse<CompetitionCategory>>(
      `/competitions/categories/${categoryId}/`,
      data,
    );
    return response.data.data;
  },

  deleteCategory: async (categoryId: number): Promise<void> => {
    await api.delete(`/competitions/categories/${categoryId}/`);
  },

  // Category groups
  listCategoryGroups: async (): Promise<CategoryGroup[]> => {
    const response = await api.get<ApiSuccessResponse<CategoryGroup[]>>(
      '/competitions/category-groups/',
    );
    return response.data.data;
  },

  // Boulders
  getBoulder: async (boulderId: number): Promise<Boulder> => {
    const response = await api.get<ApiSuccessResponse<Boulder>>(
      `/competitions/boulders/${boulderId}/`,
    );
    return response.data.data;
  },

  updateBoulder: async (
    boulderId: number,
    data: UpdateBoulderRequest,
  ): Promise<Boulder> => {
    const formData = new FormData();
    if (data.image) formData.append('image', data.image);
    if (data.section_style)
      formData.append('section_style', data.section_style);

    const response = await api.patch<ApiSuccessResponse<Boulder>>(
      `/competitions/boulders/${boulderId}/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },
};
