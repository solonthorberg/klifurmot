import { api } from './client';

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
} from '@/types';

export const competitionsApi = {
    // Competitions
    listCompetitions: async (): Promise<ApiSuccessResponse<Competition[]>> => {
        const response =
            await api.get<ApiSuccessResponse<Competition[]>>('/competitions/');
        return response.data;
    },

    getCompetition: async (
        competitionId: number,
    ): Promise<ApiSuccessResponse<Competition>> => {
        const response = await api.get<ApiSuccessResponse<Competition>>(
            `/competitions/${competitionId}/`,
        );
        return response.data;
    },

    createCompetition: async (
        data: CreateCompetitionRequest,
    ): Promise<ApiSuccessResponse<Competition>> => {
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
        return response.data;
    },

    updateCompetition: async (
        competitionId: number,
        data: UpdateCompetitionRequest,
    ): Promise<ApiSuccessResponse<Competition>> => {
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
        return response.data;
    },

    deleteCompetition: async (
        competitionId: number,
    ): Promise<ApiSuccessResponse<void>> => {
        const response = await api.delete(`/competitions/${competitionId}/`);
        return response.data;
    },

    // Competition nested data
    getCompetitionAthletes: async (
        competitionId: number,
    ): Promise<ApiSuccessResponse<CompetitionAthletesResponse>> => {
        const response = await api.get<
            ApiSuccessResponse<CompetitionAthletesResponse>
        >(`/competitions/${competitionId}/athletes/`);
        return response.data;
    },

    getCompetitionBoulders: async (
        competitionId: number,
    ): Promise<ApiSuccessResponse<CategoryBoulders[]>> => {
        const response = await api.get<ApiSuccessResponse<CategoryBoulders[]>>(
            `/competitions/${competitionId}/boulders/`,
        );
        return response.data;
    },

    getCompetitionStartlist: async (
        competitionId: number,
    ): Promise<ApiSuccessResponse<CategoryStartlist[]>> => {
        const response = await api.get<ApiSuccessResponse<CategoryStartlist[]>>(
            `/competitions/${competitionId}/startlist/`,
        );
        return response.data;
    },

    getCompetitionResults: async (
        competitionId: number,
    ): Promise<ApiSuccessResponse<CategoryResults[]>> => {
        const response = await api.get<ApiSuccessResponse<CategoryResults[]>>(
            `/competitions/${competitionId}/results/`,
        );
        return response.data;
    },

    // Rounds
    listRounds: async (
        competitionId: number,
    ): Promise<ApiSuccessResponse<Round[]>> => {
        const response = await api.get<ApiSuccessResponse<Round[]>>(
            '/competitions/rounds/',
            {
                params: { competition_id: competitionId },
            },
        );
        return response.data;
    },

    getRound: async (roundId: number): Promise<ApiSuccessResponse<Round>> => {
        const response = await api.get<ApiSuccessResponse<Round>>(
            `/competitions/rounds/${roundId}/`,
        );
        return response.data;
    },

    createRound: async (
        competitionId: number,
        data: CreateRoundRequest,
    ): Promise<ApiSuccessResponse<Round>> => {
        const response = await api.post<ApiSuccessResponse<Round>>(
            `/competitions/${competitionId}/rounds/`,
            data,
        );
        return response.data;
    },

    updateRound: async (
        roundId: number,
        data: UpdateRoundRequest,
    ): Promise<ApiSuccessResponse<Round>> => {
        const response = await api.patch<ApiSuccessResponse<Round>>(
            `/competitions/rounds/${roundId}/`,
            data,
        );
        return response.data;
    },

    updateRoundStatus: async (
        roundId: number,
        completed: boolean,
    ): Promise<ApiSuccessResponse<Round>> => {
        const response = await api.patch<ApiSuccessResponse<Round>>(
            `/competitions/rounds/${roundId}/status/`,
            { completed },
        );
        return response.data;
    },

    deleteRound: async (roundId: number): Promise<ApiSuccessResponse<void>> => {
        const response = await api.delete(`/competitions/rounds/${roundId}/`);
        return response.data;
    },

    // Round groups
    listRoundGroups: async (): Promise<ApiSuccessResponse<RoundGroup[]>> => {
        const response = await api.get<ApiSuccessResponse<RoundGroup[]>>(
            '/competitions/round-groups/',
        );
        return response.data;
    },

    // Categories
    listCategories: async (
        competitionId: number,
    ): Promise<ApiSuccessResponse<CompetitionCategory[]>> => {
        const response = await api.get<
            ApiSuccessResponse<CompetitionCategory[]>
        >('/competitions/categories/', {
            params: { competition_id: competitionId },
        });
        return response.data;
    },

    getCategory: async (
        categoryId: number,
    ): Promise<ApiSuccessResponse<CompetitionCategory>> => {
        const response = await api.get<ApiSuccessResponse<CompetitionCategory>>(
            `/competitions/categories/${categoryId}/`,
        );
        return response.data;
    },

    createCategory: async (
        data: CreateCategoryRequest,
    ): Promise<ApiSuccessResponse<CompetitionCategory>> => {
        const response = await api.post<
            ApiSuccessResponse<CompetitionCategory>
        >('/competitions/categories/', data);
        return response.data;
    },

    updateCategory: async (
        categoryId: number,
        data: UpdateCategoryRequest,
    ): Promise<ApiSuccessResponse<CompetitionCategory>> => {
        const response = await api.patch<
            ApiSuccessResponse<CompetitionCategory>
        >(`/competitions/categories/${categoryId}/`, data);
        return response.data;
    },

    deleteCategory: async (
        categoryId: number,
    ): Promise<ApiSuccessResponse<void>> => {
        const response = await api.delete(
            `/competitions/categories/${categoryId}/`,
        );
        return response.data;
    },

    // Category groups
    listCategoryGroups: async (): Promise<
        ApiSuccessResponse<CategoryGroup[]>
    > => {
        const response = await api.get<ApiSuccessResponse<CategoryGroup[]>>(
            '/competitions/category-groups/',
        );
        return response.data;
    },

    // Boulders
    getBoulder: async (
        boulderId: number,
    ): Promise<ApiSuccessResponse<Boulder>> => {
        const response = await api.get<ApiSuccessResponse<Boulder>>(
            `/competitions/boulders/${boulderId}/`,
        );
        return response.data;
    },

    updateBoulder: async (
        boulderId: number,
        data: UpdateBoulderRequest,
    ): Promise<ApiSuccessResponse<Boulder>> => {
        const formData = new FormData();
        if (data.image) formData.append('image', data.image);
        if (data.section_style)
            formData.append('section_style', data.section_style);

        const response = await api.patch<ApiSuccessResponse<Boulder>>(
            `/competitions/boulders/${boulderId}/`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data;
    },
};
