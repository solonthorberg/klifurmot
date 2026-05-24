import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Container from '@/components/ui/container';
import MainButton from '@/components/ui/mainButton';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import TabButton from '@/components/ui/tabButton';
import Icon from '@/components/ui/icons';
import { useCompetition, useRounds } from '@/hooks/api/useCompetitions';
import { useStartlist } from '@/hooks/api/useScoring';
import type { Round, Phase } from '@/types';
import JudgeScoringTab from '@/components/tabs/judgeScoringTab';
import { useAuthStore } from '@/stores';

function RoundSelectionView({
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
                    {activePhase.rounds.map((round) => (
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

function AthleteListView({
    round,
    onSelectAthlete,
}: {
    round: Round;
    onSelectAthlete: (index: number) => void;
}) {
    const { data: startlistData, isLoading } = useStartlist(round.id);
    const athletes = startlistData?.data ?? [];

    return (
        <div className="flex flex-col gap-4 w-full">
            <h3 className="font-medium text-lg text-center">
                {round.category_group_name} {round.gender}
            </h3>
            {isLoading ? (
                <LoadingSpinner />
            ) : athletes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                    Engir keppendur skráðir...
                </p>
            ) : (
                <div className="flex flex-col gap-2">
                    {athletes.map((athlete, index) => (
                        <button
                            key={athlete.id}
                            onClick={() => onSelectAthlete(index)}
                            className="flex items-center justify-between px-4 py-3 border border-outline rounded-lg hover:bg-primary-light transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-secondary text-sm w-6">
                                    {athlete.start_order}.
                                </span>
                                <span className="font-medium">
                                    {athlete.climber_name ?? '-'}
                                </span>
                            </div>
                            <Icon
                                variant="chevronDown"
                                size={16}
                                className="-rotate-90 text-secondary"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function JudgeDashboardPage() {
    const { competitionId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const { userAccount } = useAuthStore();
    const { data: competitionData } = useCompetition(Number(competitionId));
    const { data: roundsData, isLoading } = useRounds(Number(competitionId));

    const competition = competitionData?.data ?? null;
    const phases: Phase[] = roundsData?.data.phases ?? [];

    const roundId = searchParams.get('round');
    const athleteParam = searchParams.get('athlete');
    const phaseIndex = Number(searchParams.get('phase') ?? 0);

    const selectedRound =
        phases.flatMap((p) => p.rounds).find((r) => String(r.id) === roundId) ??
        null;
    const selectedAthleteIndex =
        athleteParam !== null ? Number(athleteParam) : null;

    const { data: startlistData } = useStartlist(selectedRound?.id ?? 0);
    const athletes = startlistData?.data ?? [];

    if (isLoading) return <LoadingSpinner />;

    return (
        <Container variant="primary" className="gap-4 max-w-lg mx-auto">
            <h2 className="text-2xl font-semibold text-center">
                {competition?.title}
            </h2>

            {!selectedRound && (
                <>
                    <p className="text-center">
                        {`Velkomin/n ${userAccount?.user.username}, vinsamlegast veldu umferð`}
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

            {selectedRound && selectedAthleteIndex === null && (
                <AthleteListView
                    round={selectedRound}
                    onSelectAthlete={(index) =>
                        setSearchParams({
                            round: String(selectedRound.id),
                            athlete: String(index),
                        })
                    }
                />
            )}

            {selectedRound &&
                selectedAthleteIndex !== null &&
                athletes.length > 0 && (
                    <JudgeScoringTab
                        round={selectedRound}
                        athletes={athletes}
                        initialIndex={selectedAthleteIndex}
                    />
                )}
        </Container>
    );
}
