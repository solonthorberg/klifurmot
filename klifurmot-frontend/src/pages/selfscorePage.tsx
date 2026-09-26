import JudgeScoringTab from '@/components/tabs/judgeScoringTab';
import Container from '@/components/ui/container';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import { useCompetition, useRounds } from '@/hooks/api/useCompetitions';
import { useStartlist } from '@/hooks/api/useScoring';
import { useAuthStore } from '@/stores';
import type { Phase } from '@/types';
import { useParams, useSearchParams } from 'react-router-dom';
import { RoundSelectionView } from './judgeDashboardPage';

export default function SelfscorePage() {
    const { competitionId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const { userAccount } = useAuthStore();
    const { data: competitionData } = useCompetition(Number(competitionId));
    const { data: roundsData, isLoading } = useRounds(Number(competitionId));

    const competition = competitionData?.data ?? null;
    const phases: Phase[] = roundsData?.data.phases ?? [];

    const selfscorePhases: Phase[] = phases
        .map((phase) => ({
            ...phase,
            rounds: phase.rounds.filter((round) => round.is_self_scoring),
        }))
        .filter((phase) => phase.rounds.length > 0);

    const roundId = searchParams.get('round');
    const phaseIndex = Number(searchParams.get('phase') ?? 0);

    const selectedRound =
        selfscorePhases
            .flatMap((p) => p.rounds)
            .find((r) => String(r.id) === roundId) ?? null;

    const { data: startlistData } = useStartlist(selectedRound?.id ?? 0);
    const athletes = startlistData?.data ?? [];
    const athlete = athletes.find(
        (c) => c.climber_id === userAccount?.climber_id,
    );

    if (isLoading) return <LoadingSpinner />;

    return (
        <Container variant="primary" className="gap-4 max-w-lg mx-auto">
            <h2 className="text-2xl font-semibold text-center">
                {competition?.title}
            </h2>
            {!selectedRound && (
                <>
                    <p className="text-center">
                        {`Velkomin/n ${userAccount?.user.username}, vinsamlega veldu umferð`}
                    </p>
                    <RoundSelectionView
                        phases={selfscorePhases}
                        activePhaseIndex={phaseIndex}
                        onSelectPhase={(index) =>
                            setSearchParams({ phase: String(index) })
                        }
                        onSelectRound={(round) =>
                            setSearchParams({
                                phase: String(phaseIndex),
                                round: String(round.id),
                            })
                        }
                    />
                </>
            )}
            {selectedRound && athlete && (
                <JudgeScoringTab
                    round={selectedRound}
                    athletes={[athlete]}
                    initialIndex={0}
                />
            )}
            {selectedRound && !athlete && (
                <p className="text-center">
                    Þú finnst ekki á ræsilista fyrir þessa umferð.
                </p>
            )}
        </Container>
    );
}
