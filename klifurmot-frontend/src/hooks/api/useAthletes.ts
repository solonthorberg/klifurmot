import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PublicAthlete } from '@/types/athlete';

import { athletesApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import { notify } from '@/stores/notificationStore';
import type {
    CreateClimberRequest,
    UpdateClimberRequest,
    CreateRegistrationRequest,
} from '@/types';

// Public athletes

export function usePublicAthletes(search?: string) {
    return useQuery<{ data: PublicAthlete[] }>({
        queryKey: ['athletes', search],
        queryFn: () => athletesApi.listPublicAthletes(search),
    });
}

export function usePublicAthlete(athleteId: number) {
    return useQuery({
        queryKey: ['athletes', athleteId],
        queryFn: () => athletesApi.getPublicAthleteDetail(athleteId),
        enabled: !!athleteId,
    });
}

// Admin panel climbers

export function useAthletes(search?: string) {
    return useQuery({
        queryKey: ['climbers', search],
        queryFn: () => athletesApi.listAthletes(search),
    });
}

export function useAthlete(climberId: number) {
    return useQuery({
        queryKey: ['climbers', climberId],
        queryFn: () => athletesApi.getAthlete(climberId),
        enabled: !!climberId,
    });
}

export function useCreateAthlete() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateClimberRequest) =>
            athletesApi.createAthlete(data),
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

export function useUpdateAthlete() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            climberId,
            data,
        }: {
            climberId: number;
            data: UpdateClimberRequest;
        }) => athletesApi.updateAthlete(climberId, data),
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

export function useDeleteAthlete() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (climberId: number) => athletesApi.deleteAthlete(climberId),
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
