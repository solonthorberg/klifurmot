import { useParams, useSearchParams } from 'react-router-dom';

import { getErrorMessage } from '@/api';
import AthletesTab from '@/components/tabs/athletesTab';
import BouldersTab from '@/components/tabs/bouldersTab';
import OverviewTab from '@/components/tabs/overviewTab';
import ResultsTab from '@/components/tabs/resultsTab';
import StartlistTab from '@/components/tabs/startlistTab';
import Container from '@/components/ui/container';
import ErrorMessage from '@/components/ui/errorMessage';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import TabButton from '@/components/ui/tabButton';
import { useCompetition } from '@/hooks/api/useCompetitions';

export default function CompetitionDetailPage() {
    const { competitionId } = useParams();
    const { data, isLoading, error } = useCompetition(Number(competitionId));
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = Number(searchParams.get('tab') ?? 0);

    const setTab = (index: number) => {
        setSearchParams({ tab: String(index) });
    };

    const tabs = ['Mót', 'Keppendur', 'Leiðir', 'Ráslisti', 'Niðurstöður'];

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

    const competition = data?.data;
    if (!competition) return <ErrorMessage message="Mót fannst ekki" />;

    return (
        <Container className="gap-4">
            <h1 className="text-3xl font-semibold">{competition.title}</h1>
            <div className="flex gap-2 border-b border-outline w-full overflow-x-auto">
                {tabs.map((label, index) => (
                    <TabButton
                        key={label}
                        active={tab === index}
                        onClick={() => setTab(index)}
                    >
                        {label}
                    </TabButton>
                ))}
            </div>
            <div className="w-full">
                <div key={tab} className="animate-fade-in">
                    {tab === 0 && <OverviewTab competition={competition} />}
                    {tab === 1 && (
                        <AthletesTab competitionId={competition.id} />
                    )}
                    {tab === 2 && (
                        <BouldersTab competitionId={competition.id} />
                    )}
                    {tab === 3 && (
                        <StartlistTab competitionId={competition.id} />
                    )}
                    {tab === 4 && <ResultsTab competitionId={competition.id} />}
                </div>
            </div>{' '}
        </Container>
    );
}
