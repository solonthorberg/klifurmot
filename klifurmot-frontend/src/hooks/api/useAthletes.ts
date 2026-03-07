import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { athletesApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import { notify } from '@/stores/notificationStore';
import type {
    CreateClimberRequest,
    UpdateClimberRequest,
    CreateRegistrationRequest,
} from '@/types';

// Public athletes

export function useAthletes(search?: string) {
    return useQuery({
        queryKey: ['athletes', search],
        queryFn: () => athletesApi.listAthletes(search),
    });
}

export function useAthlete(athleteId: number) {
    return useQuery({
        queryKey: ['athletes', athleteId],
        queryFn: () => athletesApi.getAthleteDetail(athleteId),
        enabled: !!athleteId,
    });
}

// Admin climbers

export function useClimbers(search?: string) {
    return useQuery({
        queryKey: ['climbers', search],
        queryFn: () => athletesApi.listAllClimbers(search),
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
        mutationFn: (data: CreateClimberRequest) =>
            athletesApi.createClimber(data),
        onSuccess: ({ message }) => {
            queryClient.invalidateQueries({ queryKey: ['climbers'] });
            queryClient.invalidateQueries({ queryKey: ['athletes'] });
            notify.success(message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
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
        onSuccess: ({ message }, { climberId }) => {
            queryClient.invalidateQueries({ queryKey: ['climbers'] });
            queryClient.invalidateQueries({
                queryKey: ['climbers', climberId],
            });
            queryClient.invalidateQueries({ queryKey: ['athletes'] });
            notify.success(message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
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
            notify.success('Climber deleted');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
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
        onSuccess: ({ message }, { competition }) => {
            queryClient.invalidateQueries({ queryKey: ['registrations'] });
            queryClient.invalidateQueries({
                queryKey: ['registrations', competition],
            });
            notify.success(message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
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
            notify.success('Registration deleted');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });
}
