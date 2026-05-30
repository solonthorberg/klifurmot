import type {
    CreateCategoryFormData,
    CreateCompetitionFormData,
    CreateRoundFormData,
    UpdateCategoryFormData,
    UpdateCompetitionFormData,
    UpdateRoundFormData,
} from '@/schemas/competition';
import { api } from './client';

import type {
    ApiSuccessResponse,
    Competition,
    RoundGroup,
    CategoryGroup,
    CompetitionCategory,
    Round,
    CompetitionAthletesResponse,
    CategoryStartlist,
    CategoryResults,
    RoundData,
    CategoryRoutes,
    Route,
    UpdateRouteRequest,
} from '@/types';

export const competitionsApi = {
    // Competitions
    listCompetitions: async (): Promise<ApiSuccessResponse<Competition[]>> => {
        const response =
            await api.get<ApiSuccessResponse<Competition[]>>('/competitions/');
        return response.data;
    },

    listPublicCompetitions: async (): Promise<
        ApiSuccessResponse<Competition[]>
    > => {
        const response = await api.get<ApiSuccessResponse<Competition[]>>(
            '/competitions/public/',
        );
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
        data: CreateCompetitionFormData,
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
        data: UpdateCompetitionFormData,
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
        // if (data.remove_image) formData.append('remove_image', 'true');

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

    getCompetitionRoutes: async (
        competitionId: number,
    ): Promise<ApiSuccessResponse<CategoryRoutes[]>> => {
        const response = await api.get<ApiSuccessResponse<CategoryRoutes[]>>(
            `/competitions/${competitionId}/routes/`,
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
    ): Promise<ApiSuccessResponse<RoundData>> => {
        const response = await api.get<ApiSuccessResponse<RoundData>>(
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
        categoryId: number,
        data: CreateRoundFormData,
    ): Promise<ApiSuccessResponse<Round>> => {
        const response = await api.post<ApiSuccessResponse<Round>>(
            `/competitions/${competitionId}/categories/${categoryId}/rounds/`,
            data,
        );
        return response.data;
    },

    updateRound: async (
        roundId: number,
        data: UpdateRoundFormData,
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
        >(`/competitions/${competitionId}/categories/`);
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
        competitionId: number,
        data: CreateCategoryFormData,
    ): Promise<ApiSuccessResponse<CompetitionCategory>> => {
        const response = await api.post<
            ApiSuccessResponse<CompetitionCategory>
        >(`/competitions/${competitionId}/categories/`, data);
        return response.data;
    },

    updateCategory: async (
        categoryId: number,
        data: UpdateCategoryFormData,
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

    // Routes
    getRoute: async (routeId: number): Promise<ApiSuccessResponse<Route>> => {
        const response = await api.get<ApiSuccessResponse<Route>>(
            `/competitions/routes/${routeId}/`,
        );
        return response.data;
    },

    updateRoute: async (
        routeId: number,
        data: UpdateRouteRequest,
    ): Promise<ApiSuccessResponse<Route>> => {
        const formData = new FormData();
        if (data.image) formData.append('image', data.image);
        if (data.section_style)
            formData.append('section_style', data.section_style);

        const response = await api.patch<ApiSuccessResponse<Route>>(
            `/competitions/routes/${routeId}/`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data;
    },

    listRoutes: async (
        roundId: number,
    ): Promise<ApiSuccessResponse<Route[]>> => {
        const response = await api.get<ApiSuccessResponse<Route[]>>(
            `/competitions/rounds/${roundId}/routes/`,
        );
        return response.data;
    },
};
