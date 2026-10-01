import JudgeScoringTab from '@/components/tabs/judgeScoringTab';
import Container from '@/components/ui/container';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import MainButton from '@/components/ui/mainButton';
import TabButton from '@/components/ui/tabButton';
import { useCompetition, useRounds } from '@/hooks/api/useCompetitions';
import { useStartlist } from '@/hooks/api/useScoring';
import { useAuthStore } from '@/stores';
import type { Phase, Round } from '@/types';
import { useParams, useSearchParams } from 'react-router-dom';

export function RoundSelectionView({
    phases,
    activePhaseIndex,
    onSelectPhase,
    onSelectRound,
}: {
    phases: Phase[];
    activePhaseIndex: number;
    onSelectPhase: (index: number) => void;
    onSelectRound: (round: Round) => void;
}) {
    const activePhase = phases[activePhaseIndex];

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex gap-2 border-b border-outline overflow-x-auto">
                {/* TODO: only display rounds with self scoring */}
                {phases.map((phase, i) => (
                    <TabButton
                        key={phase.round_order}
                        active={activePhaseIndex === i}
                        onClick={() => onSelectPhase(i)}
                        className="flex-1"
                    >
                        {phase.round_name}
                    </TabButton>
                ))}
            </div>
            {activePhase && (
                <div className="flex flex-col gap-3">
                    {activePhase.rounds
                        .filter(
                            (round) =>
                                round.is_self_scoring && !round.completed,
                        )
                        .map((round) => (
                            <MainButton
                                key={round.id}
                                variant="outline"
                                className="h-16 text-lg w-full"
                                onClick={() => onSelectRound(round)}
                            >
                                {round.category_group_name} {round.gender}
                            </MainButton>
                        ))}
                </div>
            )}
        </div>
    );
}

export default function SelfscorePage() {
    const { competitionId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const { userAccount } = useAuthStore();
    const { data: competitionData } = useCompetition(Number(competitionId));
    const { data: roundsData, isLoading } = useRounds(Number(competitionId));

    const competition = competitionData?.data ?? null;
    const phases: Phase[] = roundsData?.data.phases ?? [];

    const roundId = searchParams.get('round');
    const phaseIndex = Number(searchParams.get('phase') ?? 0);

    const selectedRound =
        phases.flatMap((p) => p.rounds).find((r) => String(r.id) === roundId) ??
        null;

    const { data: startlistData, isLoading: startlistLoading } = useStartlist(
        selectedRound?.id ?? 0,
    );
    const athletes = startlistData?.data ?? [];
    const selfEntries = athletes.filter(
        (a) => a.user_account_id === userAccount?.id,
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
                        phases={phases}
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

            {selectedRound && startlistLoading && <LoadingSpinner />}

            {selectedRound && !startlistLoading && selfEntries.length === 0 && (
                <p className="text-gray-600 text-center py-8">
                    Þú ert ekki skráð/ur á ráslista í þessari umferð
                </p>
            )}

            {selectedRound && selfEntries.length > 0 && (
                <JudgeScoringTab
                    round={selectedRound}
                    athletes={selfEntries}
                    initialIndex={0}
                />
            )}
        </Container>
    );
}
