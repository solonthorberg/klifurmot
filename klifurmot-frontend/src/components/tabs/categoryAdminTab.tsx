import { useCategoryGroups } from '@/hooks/api/useCompetitions';
import Container from '../ui/container';
import LoadingSpinner from '../ui/loadingSpinner';
import { getErrorMessage } from '@/api';
import ErrorMessage from '../ui/errorMessage';
import CategoryCard from '../cards/categoryGroupCard.tsx';

export default function CategoryAdminTab() {
    const { data, isLoading, error } = useCategoryGroups();

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

    const categoryGroups = data?.data ?? [];

    return (
        <Container variant="primaryCenter" className="max-w-xl gap-4">
            {categoryGroups.map((c) => (
                <CategoryCard key={c.id} category={c} />
            ))}
        </Container>
    );
}
