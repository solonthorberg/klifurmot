import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '@/api';

export function useUserAccounts() {
    return useQuery({
        queryKey: ['user-accounts'],
        queryFn: accountsApi.listUserAccounts,
    });
}
