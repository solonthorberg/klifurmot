import { getErrorMessage } from '@/api';
import Container from '@/components/ui/container';
import ErrorMessage from '@/components/ui/errorMessage';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import TabButton from '@/components/ui/tabButton';
import { useCompetition, useRounds } from '@/hooks/api/useCompetitions';
import { useParams, useSearchParams } from 'react-router-dom';
import { type Phase } from '@/types';
import MainButton from '@/components/ui/mainButton';

export default function AdminPanelDetailsPage() {
    const { competitionId } = useParams();
    const {
        data: competitionData,
        isLoading,
        error,
    } = useCompetition(Number(competitionId));

    const { data: roundsData } = useRounds(Number(competitionId));
    const [searchParams, setSearchParams] = useSearchParams();

    const activeRoundOrder = Number(searchParams.get('tab') ?? 1);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

    const setTab = (order: number) => {
        setSearchParams({ tab: String(order) });
    };

    const competition = competitionData?.data ?? null;
    const phases: Phase[] = roundsData?.data.phases ?? [];
    const activePhase =
        phases.find((p) => p.round_order === activeRoundOrder) || phases[0];

    return (
        <Container className="gap-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">{competition?.title}</h2>
                <MainButton>Dómaraviðmót</MainButton>
            </div>

            <div className="flex gap-2 border-b border-outline w-full overflow-x-auto">
                {phases.map((phase) => (
                    <TabButton
                        key={phase.round_order}
                        active={activeRoundOrder === phase.round_order}
                        onClick={() => setTab(phase.round_order)}
                    >
                        {phase.round_name}
                    </TabButton>
                ))}
            </div>

            {activePhase && (
                <>
                    {activePhase.rounds.map((round) => (
                        <div
                            key={round.id}
                            className="flex gap-4 p-4 flex-col border border-outline rounded-md"
                        >
                            <div className="font-semibold text-lg">
                                {round.category_group_name} - {round.gender}
                            </div>
                            {/* List of athletes that can be reordered by dragging */}
                            <div className="flex gap-2 justify-start">
                                <MainButton>+ Keppandi</MainButton>
                                <MainButton variant="outline">
                                    Flytja í næstu umferð
                                </MainButton>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                                Búlder leiðir: {round.boulder_count} | Staða:{' '}
                                {round.status}
                            </div>
                        </div>
                    ))}
                </>
            )}

            <div className="flex flex-col gap-8 p-8 justify-center w-full border border-outline rounded-lg">
                <h2 className="text-xl font-semibold">Dómaraslóðir</h2>
                {/* Dómaraslóðir Component */}
            </div>
        </Container>
    );
}
