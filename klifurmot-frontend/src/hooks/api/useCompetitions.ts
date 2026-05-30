import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { competitionsApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import { notify } from '@/stores/notificationStore';
import type { UpdateRouteRequest } from '@/types';
import type {
    CreateCategoryFormData,
    CreateCompetitionFormData,
    CreateRoundFormData,
    UpdateCategoryFormData,
    UpdateCompetitionFormData,
    UpdateRoundFormData,
} from '@/schemas/competition';

// Competitions
export function useCompetitions() {
    return useQuery({
        queryKey: ['competitions'],
        queryFn: competitionsApi.listCompetitions,
    });
}

export function usePublicCompetitions() {
    return useQuery({
        queryKey: ['competitions', 'admin'],
        queryFn: competitionsApi.listPublicCompetitions,
    });
}

export function useCompetition(competitionId: number) {
    return useQuery({
        queryKey: ['competitions', competitionId],
        queryFn: () => competitionsApi.getCompetition(competitionId),
        enabled: !!competitionId,
    });
}

export function useCreateCompetition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateCompetitionFormData) =>
            competitionsApi.createCompetition(data),
        onSuccess: ({ message }) => {
            queryClient.invalidateQueries({ queryKey: ['competitions'] });
            notify.success(message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}

export function useUpdateCompetition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            competitionId,
            data,
        }: {
            competitionId: number;
            data: UpdateCompetitionFormData;
        }) => competitionsApi.updateCompetition(competitionId, data),
        onSuccess: ({ message }, { competitionId }) => {
            queryClient.invalidateQueries({ queryKey: ['competitions'] });
            queryClient.invalidateQueries({
                queryKey: ['competitions', competitionId],
            });
            notify.success(message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}

export function useDeleteCompetition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (competitionId: number) =>
            competitionsApi.deleteCompetition(competitionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['competitions'] });
            notify.success('Competition deleted');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}

// Competition nested data
export function useCompetitionAthletes(competitionId: number) {
    return useQuery({
        queryKey: ['competitions', competitionId, 'athletes'],
        queryFn: () => competitionsApi.getCompetitionAthletes(competitionId),
        enabled: !!competitionId,
    });
}

export function useCompetitionRoutes(competitionId: number) {
    return useQuery({
        queryKey: ['competitions', competitionId, 'routes'],
        queryFn: () => competitionsApi.getCompetitionRoutes(competitionId),
        enabled: !!competitionId,
    });
}

export function useCompetitionStartlist(competitionId: number) {
    return useQuery({
        queryKey: ['competitions', competitionId, 'startlist'],
        queryFn: () => competitionsApi.getCompetitionStartlist(competitionId),
        enabled: !!competitionId,
    });
}

export function useCompetitionResults(competitionId: number) {
    return useQuery({
        queryKey: ['competitions', competitionId, 'results'],
        queryFn: () => competitionsApi.getCompetitionResults(competitionId),
        enabled: !!competitionId,
    });
}

// Rounds
export function useRounds(competitionId: number) {
    return useQuery({
        queryKey: ['rounds', competitionId],
        queryFn: () => competitionsApi.listRounds(competitionId),
        enabled: !!competitionId,
    });
}

export function useRound(roundId: number) {
    return useQuery({
        queryKey: ['rounds', 'detail', roundId],
        queryFn: () => competitionsApi.getRound(roundId),
        enabled: !!roundId,
    });
}

export function useCreateRound() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            competitionId,
            categoryId,
            data,
        }: {
            competitionId: number;
            categoryId: number;
            data: CreateRoundFormData;
        }) => competitionsApi.createRound(competitionId, categoryId, data),
        onSuccess: ({ message }, { competitionId }) => {
            queryClient.invalidateQueries({
                queryKey: ['rounds', competitionId],
            });
            notify.success(message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}

export function useUpdateRound() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            roundId,
            data,
        }: {
            roundId: number;
            data: UpdateRoundFormData;
        }) => competitionsApi.updateRound(roundId, data),
        onSuccess: ({ message }) => {
            queryClient.invalidateQueries({ queryKey: ['rounds'] });
            notify.success(message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}

export function useUpdateRoundStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            roundId,
            completed,
        }: {
            roundId: number;
            completed: boolean;
        }) => competitionsApi.updateRoundStatus(roundId, completed),
        onSuccess: ({ message }) => {
            queryClient.invalidateQueries({ queryKey: ['rounds'] });
            notify.success(message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}

export function useDeleteRound() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (roundId: number) => competitionsApi.deleteRound(roundId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rounds'] });
            notify.success('Round deleted');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}

// Round groups
export function useRoundGroups() {
    return useQuery({
        queryKey: ['round-groups'],
        queryFn: competitionsApi.listRoundGroups,
        staleTime: 1000 * 60 * 60,
    });
}

// Categories
export function useCategories(competitionId: number) {
    return useQuery({
        queryKey: ['categories', competitionId],
        queryFn: () => competitionsApi.listCategories(competitionId),
        enabled: !!competitionId,
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            competitionId,
            data,
        }: {
            competitionId: number;
            data: CreateCategoryFormData;
        }) => competitionsApi.createCategory(competitionId, data),
        onSuccess: ({ message }, { competitionId }) => {
            queryClient.invalidateQueries({
                queryKey: ['categories', competitionId],
            });
            notify.success(message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            categoryId,
            data,
        }: {
            categoryId: number;
            data: UpdateCategoryFormData;
        }) => competitionsApi.updateCategory(categoryId, data),
        onSuccess: ({ message }) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            notify.success(message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (categoryId: number) =>
            competitionsApi.deleteCategory(categoryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            notify.success('Category deleted');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}

// Category groups
export function useCategoryGroups() {
    return useQuery({
        queryKey: ['category-groups'],
        queryFn: competitionsApi.listCategoryGroups,
        staleTime: 1000 * 60 * 5,
    });
}

// Routes
export function useRoute(routeId: number) {
    return useQuery({
        queryKey: ['routes', routeId],
        queryFn: () => competitionsApi.getRoute(routeId),
        enabled: !!routeId,
    });
}

export function useRoutes(roundId: number) {
    return useQuery({
        queryKey: ['routes', 'round', roundId],
        queryFn: () => competitionsApi.listRoutes(roundId),
        enabled: !!roundId,
    });
}

export function useUpdateRoute() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            routeId,
            data,
        }: {
            routeId: number;
            data: UpdateRouteRequest;
        }) => competitionsApi.updateRoute(routeId, data),
        onSuccess: ({ message }, { routeId }) => {
            queryClient.invalidateQueries({
                queryKey: ['routes', routeId],
            });
            queryClient.invalidateQueries({ queryKey: ['competitions'] });
            notify.success(message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}
