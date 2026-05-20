import { useRoundGroups } from '@/hooks/api/useCompetitions';
import Container from '../ui/container';
import LoadingSpinner from '../ui/loadingSpinner';
import { getErrorMessage } from '@/api';
import ErrorMessage from '../ui/errorMessage';
import RoundGroupCard from '../cards/roundGroupCard';

export default function RoundAdminTab() {
    const { data, isLoading, error } = useRoundGroups();

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

    const roundGroups = data?.data ?? [];

    return (
        <Container variant="primaryCenter" className="max-w-xl gap-4">
            {roundGroups.map((c) => (
                <RoundGroupCard key={c.id} round={c} />
            ))}
        </Container>
    );
}
