import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { scoringApi } from '@/api/Index';
import type {
  CreateClimbRequest,
  UpdateClimbRequest,
  CreateStartlistRequest,
  UpdateStartlistRequest,
} from '@/types/Index';

// Climbs
export function useClimbs(roundId: number, climberId?: number) {
  return useQuery({
    queryKey: ['climbs', roundId, climberId],
    queryFn: () => scoringApi.listClimbs(roundId, climberId),
    enabled: !!roundId,
  });
}

export function useClimb(climbId: number) {
  return useQuery({
    queryKey: ['climbs', 'detail', climbId],
    queryFn: () => scoringApi.getClimb(climbId),
    enabled: !!climbId,
  });
}

export function useCreateClimb() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClimbRequest) => scoringApi.createClimb(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['climbs'] });
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

export function useUpdateClimb() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      climbId,
      data,
    }: {
      climbId: number;
      data: UpdateClimbRequest;
    }) => scoringApi.updateClimb(climbId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['climbs'] });
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

export function useDeleteClimb() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (climbId: number) => scoringApi.deleteClimb(climbId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['climbs'] });
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

// Startlist
export function useStartlist(roundId: number) {
  return useQuery({
    queryKey: ['startlist', roundId],
    queryFn: () => scoringApi.listStartlist(roundId),
    enabled: !!roundId,
  });
}

export function useAddToStartlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStartlistRequest) =>
      scoringApi.addToStartlist(data),
    onSuccess: (_data, { round }) => {
      queryClient.invalidateQueries({ queryKey: ['startlist', round] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

export function useUpdateStartlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      resultId,
      data,
    }: {
      resultId: number;
      data: UpdateStartlistRequest;
    }) => scoringApi.updateStartlist(resultId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startlist'] });
    },
  });
}

export function useRemoveFromStartlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resultId: number) => scoringApi.removeFromStartlist(resultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startlist'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

// Scores
export function useScores(roundId: number) {
  return useQuery({
    queryKey: ['scores', roundId],
    queryFn: () => scoringApi.listScores(roundId),
    enabled: !!roundId,
  });
}

// Advance climbers
export function useAdvanceClimbers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roundId: number) => scoringApi.advanceClimbers(roundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startlist'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}
