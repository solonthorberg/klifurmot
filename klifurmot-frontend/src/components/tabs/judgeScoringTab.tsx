import { useEffect, useState } from 'react';
import MainButton from '@/components/ui/mainButton';
import Modal from '@/components/modals/modal';
import Icon from '@/components/ui/icons';
import {
    useClimbs,
    useCreateClimb,
    useUpdateClimb,
} from '@/hooks/api/useScoring';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import type { Round, StartlistEntry, Route } from '@/types';
import { useRoutes } from '@/hooks/api/useCompetitions';
import Select from '../ui/select';

interface BoulderScore {
    climbId: number | null;
    zone_attempts: number;
    top_attempts: number;
    zone_reached: boolean;
    top_reached: boolean;
}

function applyScore(
    current: BoulderScore,
    action: 'attempt' | 'zone' | 'top',
): BoulderScore {
    if (current.top_reached) return current;
    const next = { ...current };
    if (action === 'attempt') {
        if (current.zone_reached) {
            next.top_attempts += 1;
        } else {
            next.zone_attempts += 1;
            next.top_attempts += 1;
        }
    } else if (action === 'zone') {
        if (current.zone_reached) {
            next.top_attempts += 1;
        } else {
            next.zone_attempts += 1;
            next.top_attempts += 1;
            next.zone_reached = true;
        }
    } else if (action === 'top') {
        next.top_attempts += 1;
        next.top_reached = true;
        if (!current.zone_reached) {
            next.zone_attempts += 1;
            next.zone_reached = true;
        }
    }
    return next;
}

function EditScoreModal({
    boulderNumber,
    initialScore,
    onConfirm,
    onClose,
}: {
    boulderNumber: number;
    initialScore: BoulderScore;
    onConfirm: (score: BoulderScore) => void;
    onClose: () => void;
}) {
    const [tempScore, setTempScore] = useState<BoulderScore>(initialScore);

    const adjust = (field: 'zone_attempts' | 'top_attempts', delta: number) => {
        setTempScore((prev) => {
            let zone = prev.zone_attempts;
            let top = prev.top_attempts;

            if (field === 'zone_attempts') {
                zone = Math.max(0, zone + delta);
                if (prev.top_reached) zone = Math.max(1, zone);
                if (!prev.zone_reached) top = zone;
                else if (delta > 0 && zone > top) top = zone;
                else if (prev.zone_reached && zone === 0) top = 0;
            }

            if (field === 'top_attempts') {
                top = Math.max(0, top + delta);
                if (!prev.zone_reached) zone = top;
                else if (zone > top) zone = top;
            }

            return {
                ...prev,
                zone_attempts: zone,
                top_attempts: top,
                zone_reached: prev.zone_reached && zone > 0,
                top_reached: prev.top_reached && top > 0,
            };
        });
    };

    const toggle = (field: 'zone_reached' | 'top_reached') => {
        setTempScore((prev) => {
            const next = { ...prev };
            if (field === 'zone_reached') {
                if (!prev.zone_reached) {
                    next.zone_reached = true;
                    if (next.zone_attempts < 1) next.zone_attempts = 1;
                    if (next.top_attempts < 1) next.top_attempts = 1;
                } else if (!prev.top_reached) {
                    next.zone_reached = false;
                    next.zone_attempts = next.top_attempts;
                }
            } else if (field === 'top_reached') {
                if (!prev.top_reached) {
                    next.top_reached = true;
                    if (!next.zone_reached) next.zone_reached = true;
                    if (next.zone_attempts < 1) next.zone_attempts = 1;
                    if (next.top_attempts < 1) next.top_attempts = 1;
                } else {
                    next.top_reached = false;
                }
            }
            return next;
        });
    };

    return (
        <Modal onClose={onClose}>
            <h2 className="text-lg font-semibold mb-4 text-center">
                Leið {boulderNumber}
            </h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
                {[
                    {
                        attemptsField: 'zone_attempts' as const,
                        reachedField: 'zone_reached' as const,
                        label: 'Miðju',
                        disabledWhen: false,
                    },
                    {
                        attemptsField: 'top_attempts' as const,
                        reachedField: 'top_reached' as const,
                        label: 'Topp',
                        disabledWhen: false,
                    },
                ].map(({ attemptsField, reachedField, label }) => (
                    <div
                        key={label}
                        className="flex flex-col items-center gap-2"
                    >
                        <span className="text-sm font-medium">
                            Tilraunir í {label}
                        </span>
                        <MainButton
                            type="button"
                            size="small"
                            variant="outline"
                            square
                            onClick={() => adjust(attemptsField, 1)}
                        >
                            ▲
                        </MainButton>
                        <div className="border border-outline rounded-lg w-full flex items-center justify-center py-4">
                            <span className="text-3xl font-semibold">
                                {tempScore[attemptsField]}
                            </span>
                        </div>
                        <MainButton
                            type="button"
                            size="small"
                            variant="outline"
                            square
                            onClick={() => adjust(attemptsField, -1)}
                        >
                            ▼
                        </MainButton>
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <input
                                type="checkbox"
                                checked={tempScore[reachedField]}
                                disabled={
                                    reachedField === 'zone_reached' &&
                                    tempScore.top_reached
                                }
                                onChange={() => toggle(reachedField)}
                                className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm font-medium">
                                {label} náð
                            </span>
                        </label>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <MainButton
                    className="flex-1"
                    onClick={() => onConfirm(tempScore)}
                >
                    Samþykkja
                </MainButton>
                <MainButton
                    variant="outline"
                    className="flex-1"
                    onClick={onClose}
                >
                    Hætta við
                </MainButton>
            </div>
        </Modal>
    );
}

interface JudgeScoringViewProps {
    round: Round;
    athletes: StartlistEntry[];
    initialIndex: number;
}

export default function JudgeScoringView({
    round,
    athletes,
    initialIndex,
}: JudgeScoringViewProps) {
    const [athleteIndex, setAthleteIndex] = useState(initialIndex);
    const [boulderIndex, setBoulderIndex] = useState(0);
    const [editingScore, setEditingScore] = useState<BoulderScore | null>(null);
    const [localScore, setLocalScore] = useState<BoulderScore | null>(null);

    const athlete = athletes[athleteIndex];

    const { data: bouldersData, isLoading: bouldersLoading } = useRoutes(
        round.id,
    );
    const { data: climbsData, refetch: refetchClimbs } = useClimbs(
        round.id,
        athlete?.climber_id,
    );
    const { mutateAsync: createClimb } = useCreateClimb();
    const { mutateAsync: updateClimb } = useUpdateClimb();

    const boulders: Route[] = bouldersData?.data ?? [];
    const climbs = climbsData?.data ?? [];
    const currentBoulder = boulders[boulderIndex];

    const getScoreForBoulder = (boulderId: number): BoulderScore => {
        const climb = climbs.find((c) => c.route_id === boulderId);
        if (climb) {
            return {
                climbId: climb.id,
                zone_attempts: climb.attempts_zone,
                top_attempts: climb.attempts_top,
                zone_reached: climb.zone_reached,
                top_reached: climb.top_reached,
            };
        }
        return {
            climbId: null,
            zone_attempts: 0,
            top_attempts: 0,
            zone_reached: false,
            top_reached: false,
        };
    };

    useEffect(() => {
        setLocalScore(null);
    }, [boulderIndex, athleteIndex]);

    const currentScore =
        localScore ??
        (currentBoulder ? getScoreForBoulder(currentBoulder.id) : null);

    const submitScore = async (score: BoulderScore) => {
        if (!currentBoulder || !athlete) return;
        const payload = {
            climber: athlete.climber_id,
            route: currentBoulder.id,
            attempts_zone: score.zone_attempts,
            attempts_top: score.top_attempts,
            zone_reached: score.zone_reached,
            top_reached: score.top_reached,
        };

        let climbId = score.climbId;

        if (climbId) {
            await updateClimb({ climbId, data: payload });
        } else {
            const result = await createClimb(payload);
            climbId = result.data.id;
        }

        setLocalScore({ ...score, climbId });
        refetchClimbs();
    };

    const handleScore = async (action: 'attempt' | 'zone' | 'top') => {
        if (!currentScore) return;
        const newScore = applyScore(currentScore, action);
        setLocalScore(newScore);
        await submitScore(newScore);
    };

    const handleEditConfirm = async (score: BoulderScore) => {
        setLocalScore(score);
        await submitScore(score);
        setEditingScore(null);
    };

    const goToAthlete = (index: number) => {
        setAthleteIndex(index);
    };

    if (bouldersLoading || !athlete) return <LoadingSpinner />;

    const boulderOptions = boulders.map((boulder, i) => ({
        value: String(i),
        label: `Leið ${boulder.route_number}`,
    }));

    return (
        <div className="flex flex-col gap-4 w-full">
            <span className="font-medium text-lg text-center">
                ({athlete.start_order}) {athlete.climber_name}
            </span>
            <Select
                value={String(boulderIndex)}
                onChange={(val) => setBoulderIndex(Number(val))}
                options={boulderOptions}
            />

            {currentScore && currentBoulder && (
                <div className="border border-outline rounded-lg p-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg">
                            Leið {currentBoulder.route_number}
                        </h3>
                        <MainButton
                            size="small"
                            variant="outline"
                            square
                            onClick={() => setEditingScore(currentScore)}
                        >
                            <Icon variant="edit" size={14} />
                        </MainButton>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {[
                            {
                                label: 'Tilraunir í Miðju',
                                attempts: currentScore.zone_attempts,
                                reached: currentScore.zone_reached,
                                reachedLabel: 'Miðja',
                            },
                            {
                                label: 'Tilraunir í Topp',
                                attempts: currentScore.top_attempts,
                                reached: currentScore.top_reached,
                                reachedLabel: 'Toppur',
                            },
                        ].map(({ label, attempts, reached, reachedLabel }) => (
                            <div
                                key={label}
                                className="flex flex-col items-center gap-2"
                            >
                                <span className="text-sm font-medium text-gray-600">
                                    {label}
                                </span>
                                <div className="border border-outline rounded-lg w-full flex items-center justify-center py-6">
                                    <span className="text-4xl font-semibold">
                                        {attempts}
                                    </span>
                                </div>
                                <span
                                    className={`font-medium px-3 py-1 rounded-lg border-2 ${
                                        reached
                                            ? 'text-primary border-primary bg-primary-light'
                                            : 'text-gray-400 border-outline'
                                    }`}
                                >
                                    {reachedLabel}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2">
                        <MainButton
                            className="w-full h-14 text-lg"
                            disabled={currentScore.top_reached}
                            onClick={() => handleScore('top')}
                        >
                            Toppur
                        </MainButton>
                        <MainButton
                            variant="outline"
                            className="w-full h-14 text-lg"
                            disabled={currentScore.top_reached}
                            onClick={() => handleScore('zone')}
                        >
                            Miðja
                        </MainButton>
                        <MainButton
                            variant="outline"
                            className="w-full h-14 text-lg"
                            disabled={currentScore.top_reached}
                            onClick={() => handleScore('attempt')}
                        >
                            Tilraun
                        </MainButton>
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                <MainButton
                    variant="outline"
                    className="flex-1"
                    disabled={athleteIndex === 0}
                    onClick={() => goToAthlete(athleteIndex - 1)}
                >
                    Fyrri
                </MainButton>
                <MainButton
                    className="flex-1"
                    disabled={athleteIndex === athletes.length - 1}
                    onClick={() => goToAthlete(athleteIndex + 1)}
                >
                    Næsti
                </MainButton>
            </div>

            {editingScore && currentBoulder && (
                <EditScoreModal
                    boulderNumber={currentBoulder.route_number}
                    initialScore={editingScore}
                    onConfirm={handleEditConfirm}
                    onClose={() => setEditingScore(null)}
                />
            )}
        </div>
    );
}
