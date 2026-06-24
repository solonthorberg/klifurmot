import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import Container from '@/components/ui/container';
import MainButton from '@/components/ui/mainButton';
import { judgesApi } from '@/api/judges';

type PageState = 'loading' | 'error';

export default function JudgeTokenPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isInitializing } = useAuthStore();
    const [pageState, setPageState] = useState<PageState>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isInitializing) return;
        if (!token) {
            setErrorMessage('Ógild slóð');
            setPageState('error');
            return;
        }
        activateToken(token);
    }, [isInitializing, token]);

    const activateToken = async (token: string) => {
        setPageState('loading');

        try {
            const invResult = await judgesApi.claimInvitation(token);
            const data = invResult.data as {
                competition_id?: number;
                requires_auth?: boolean;
            };

            if (data.requires_auth) {
                navigate(
                    `/register?redirect=${encodeURIComponent(location.pathname)}`,
                    { replace: true },
                );
                return;
            }

            if (data.competition_id) {
                navigate(
                    `/competitions/${data.competition_id}/judge-dashboard`,
                    { replace: true },
                );
            }
        } catch {
            if (!isAuthenticated) {
                navigate(
                    `/login?redirect=${encodeURIComponent(location.pathname)}`,
                    { replace: true },
                );
                return;
            }

            try {
                const result = await judgesApi.validateJudgeLink(token);
                navigate(
                    `/competitions/${result.data.competition_id}/judge-dashboard`,
                    { replace: true },
                );
            } catch (err: unknown) {
                const status = (err as { response?: { status?: number } })
                    ?.response?.status;
                setErrorMessage(
                    status === 403
                        ? 'Þessi slóð er ekki fyrir þig'
                        : 'Þessi slóð er ógild eða útrunnin',
                );
                setPageState('error');
            }
        }
    };

    if (pageState === 'error') {
        return (
            <Container variant="primaryCenter" className="gap-4">
                <h1 className="text-2xl font-semibold">Ógild slóð</h1>
                <p className="text-gray-500 text-center">{errorMessage}</p>
                <MainButton onClick={() => navigate('/')}>Tilbaka</MainButton>
            </Container>
        );
    }

    return <LoadingSpinner />;
}
