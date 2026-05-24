import { getErrorMessage } from '@/api';
import Container from '@/components/ui/container';
import ErrorMessage from '@/components/ui/errorMessage';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import TabButton from '@/components/ui/tabButton';
import { useCompetition, useRounds } from '@/hooks/api/useCompetitions';
import { useAthletes, useRegistrations } from '@/hooks/api/useAthletes';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Phase } from '@/types';
import MainButton from '@/components/ui/mainButton';
import RoundStartlistCard from '@/components/cards/roundStartlistCard';
import JudgeLinkTab from '@/components/tabs/judgeLinkTab';

export default function AdminPanelDetailsPage() {
    const { competitionId } = useParams();
    const {
        data: competitionData,
        isLoading,
        error,
    } = useCompetition(Number(competitionId));
    const { data: roundsData } = useRounds(Number(competitionId));
    const { data: registrationsData } = useRegistrations(Number(competitionId));
    const { data: athletesData } = useAthletes();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const activeRoundOrder = Number(searchParams.get('tab') ?? 1);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

    const setTab = (order: number) => setSearchParams({ tab: String(order) });

    const competition = competitionData?.data ?? null;
    const phases: Phase[] = roundsData?.data.phases ?? [];
    const activePhase =
        phases.find((p) => p.round_order === activeRoundOrder) ?? phases[0];
    const isLastPhase =
        activePhase?.round_order === phases[phases.length - 1]?.round_order;
    const registrations = registrationsData?.data ?? [];
    const allAthletes = athletesData?.data ?? [];

    return (
        <Container className="gap-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">{competition?.title}</h2>
                <MainButton
                    onClick={() =>
                        navigate(
                            `/competitions/${competitionId}/judge-dashboard`,
                        )
                    }
                >
                    Dómaraviðmót
                </MainButton>
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
                <div className="flex flex-col gap-4">
                    {activePhase.rounds.map((round) => (
                        <RoundStartlistCard
                            key={round.id}
                            round={round}
                            registrations={registrations}
                            allAthletes={allAthletes}
                            isLastRound={isLastPhase}
                        />
                    ))}
                </div>
            )}

            <div className="flex flex-col gap-8 p-8 justify-center w-full border border-outline rounded-lg">
                <h2 className="text-xl font-semibold">Dómaraslóðir</h2>
                <JudgeLinkTab competitionId={Number(competitionId)} />
            </div>
        </Container>
    );
}
