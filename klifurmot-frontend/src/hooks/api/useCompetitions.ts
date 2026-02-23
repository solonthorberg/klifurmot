import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { competitionsApi } from '@/api/Index';
import type {
  CreateCompetitionRequest,
  UpdateCompetitionRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateRoundRequest,
  UpdateRoundRequest,
  UpdateBoulderRequest,
} from '@/types/Index';

// Competitions
export function useCompetitions() {
  return useQuery({
    queryKey: ['competitions'],
    queryFn: competitionsApi.list,
  });
}

export function useCompetition(competitionId: number) {
  return useQuery({
    queryKey: ['competitions', competitionId],
    queryFn: () => competitionsApi.get(competitionId),
    enabled: !!competitionId,
  });
}

export function useCreateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompetitionRequest) =>
      competitionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
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
      data: UpdateCompetitionRequest;
    }) => competitionsApi.update(competitionId, data),
    onSuccess: (_data, { competitionId }) => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      queryClient.invalidateQueries({
        queryKey: ['competitions', competitionId],
      });
    },
  });
}

export function useDeleteCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (competitionId: number) =>
      competitionsApi.delete(competitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

// Competition nested data
export function useCompetitionAthletes(competitionId: number) {
  return useQuery({
    queryKey: ['competitions', competitionId, 'athletes'],
    queryFn: () => competitionsApi.getAthletes(competitionId),
    enabled: !!competitionId,
  });
}

export function useCompetitionBoulders(competitionId: number) {
  return useQuery({
    queryKey: ['competitions', competitionId, 'boulders'],
    queryFn: () => competitionsApi.getBoulders(competitionId),
    enabled: !!competitionId,
  });
}

export function useCompetitionStartlist(competitionId: number) {
  return useQuery({
    queryKey: ['competitions', competitionId, 'startlist'],
    queryFn: () => competitionsApi.getStartlist(competitionId),
    enabled: !!competitionId,
  });
}

export function useCompetitionResults(competitionId: number) {
  return useQuery({
    queryKey: ['competitions', competitionId, 'results'],
    queryFn: () => competitionsApi.getResults(competitionId),
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
      data,
    }: {
      competitionId: number;
      data: CreateRoundRequest;
    }) => competitionsApi.createRound(competitionId, data),
    onSuccess: (_data, { competitionId }) => {
      queryClient.invalidateQueries({ queryKey: ['rounds', competitionId] });
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
      data: UpdateRoundRequest;
    }) => competitionsApi.updateRound(roundId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}

export function useDeleteRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roundId: number) => competitionsApi.deleteRound(roundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}

// Round groups
export function useRoundGroups() {
  return useQuery({
    queryKey: ['round-groups'],
    queryFn: competitionsApi.listRoundGroups,
    staleTime: 1000 * 60 * 60, // 1 hour - rarely changes
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
    mutationFn: (data: CreateCategoryRequest) =>
      competitionsApi.createCategory(data),
    onSuccess: (_data, { competition }) => {
      queryClient.invalidateQueries({ queryKey: ['categories', competition] });
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
      data: UpdateCategoryRequest;
    }) => competitionsApi.updateCategory(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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
    },
  });
}

// Category groups
export function useCategoryGroups() {
  return useQuery({
    queryKey: ['category-groups'],
    queryFn: competitionsApi.listCategoryGroups,
    staleTime: 1000 * 60 * 60, // 1 hour - rarely changes
  });
}

// Boulders
export function useBoulder(boulderId: number) {
  return useQuery({
    queryKey: ['boulders', boulderId],
    queryFn: () => competitionsApi.getBoulder(boulderId),
    enabled: !!boulderId,
  });
}

export function useUpdateBoulder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boulderId,
      data,
    }: {
      boulderId: number;
      data: UpdateBoulderRequest;
    }) => competitionsApi.updateBoulder(boulderId, data),
    onSuccess: (_data, { boulderId }) => {
      queryClient.invalidateQueries({ queryKey: ['boulders', boulderId] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}
