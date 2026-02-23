import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { athletesApi } from '@/api/Index';
import type {
  CreateClimberRequest,
  UpdateClimberRequest,
  CreateRegistrationRequest,
} from '@/types/Index';

// Public athletes
export function useAthletes(search?: string) {
  return useQuery({
    queryKey: ['athletes', search],
    queryFn: () => athletesApi.list(search),
  });
}

export function useAthlete(athleteId: number) {
  return useQuery({
    queryKey: ['athletes', athleteId],
    queryFn: () => athletesApi.get(athleteId),
    enabled: !!athleteId,
  });
}

// Admin climbers
export function useClimbers(search?: string) {
  return useQuery({
    queryKey: ['climbers', search],
    queryFn: () => athletesApi.listClimbers(search),
  });
}

export function useClimber(climberId: number) {
  return useQuery({
    queryKey: ['climbers', climberId],
    queryFn: () => athletesApi.getClimber(climberId),
    enabled: !!climberId,
  });
}

export function useCreateClimber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClimberRequest) => athletesApi.createClimber(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['climbers'] });
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
    },
  });
}

export function useUpdateClimber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      climberId,
      data,
    }: {
      climberId: number;
      data: UpdateClimberRequest;
    }) => athletesApi.updateClimber(climberId, data),
    onSuccess: (_data, { climberId }) => {
      queryClient.invalidateQueries({ queryKey: ['climbers'] });
      queryClient.invalidateQueries({ queryKey: ['climbers', climberId] });
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
    },
  });
}

export function useDeleteClimber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (climberId: number) => athletesApi.deleteClimber(climberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['climbers'] });
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
    },
  });
}

// Registrations
export function useRegistrations(competitionId?: number) {
  return useQuery({
    queryKey: ['registrations', competitionId],
    queryFn: () => athletesApi.listRegistrations(competitionId),
  });
}

export function useCreateRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRegistrationRequest) =>
      athletesApi.createRegistration(data),
    onSuccess: (_data, { competition }) => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({
        queryKey: ['registrations', competition],
      });
    },
  });
}

export function useDeleteRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (registrationId: number) =>
      athletesApi.deleteRegistration(registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
}
