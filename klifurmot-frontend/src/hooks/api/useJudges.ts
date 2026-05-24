import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/api/client';
import { notify } from '@/stores/notificationStore';
import { judgesApi } from '@/api/judges';

export function usePotentialJudges() {
    return useQuery({
        queryKey: ['potential-judges'],
        queryFn: judgesApi.getPotentialJudges,
    });
}

export function useAllJudges(competitionId: number) {
    return useQuery({
        queryKey: ['judges', competitionId],
        queryFn: () => judgesApi.getAllJudges(competitionId),
        enabled: !!competitionId,
    });
}

export function useCreateJudgeLink(competitionId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { user_id: number }) =>
            judgesApi.createJudgeLink(competitionId, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ['judges', competitionId],
            });
            notify.success(data.message);
        },
        onError: (error) => notify.error(getErrorMessage(error)),
    });
}

export function useSendInvitation(competitionId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { email: string; name?: string }) =>
            judgesApi.sendInvitation(competitionId, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ['judges', competitionId],
            });
            notify.success(data.message);
        },
        onError: (error) => notify.error(getErrorMessage(error)),
    });
}

export function useDeleteJudgeLink(competitionId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (linkId: number) => judgesApi.deleteJudgeLink(linkId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['judges', competitionId],
            });
            notify.success('Dómaraslóð eytt');
        },
        onError: (error) => notify.error(getErrorMessage(error)),
    });
}

export function useValidateJudgeLink(token: string) {
    return useQuery({
        queryKey: ['judge-link', token],
        queryFn: () => judgesApi.validateJudgeLink(token),
        enabled: !!token,
        retry: false,
    });
}

export function useClaimInvitation() {
    return useMutation({
        mutationFn: (token: string) => judgesApi.claimInvitation(token),
        onError: (error) => notify.error(getErrorMessage(error)),
    });
}
