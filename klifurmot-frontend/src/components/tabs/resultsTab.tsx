import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import ResultCard from '../cards/resultCard';
import Container from '../ui/container';
import ErrorMessage from '../ui/errorMessage';
import LoadingSpinner from '../ui/loadingSpinner';
import Select from '../ui/select';

import { getErrorMessage } from '@/api';
import { useCompetitionResults } from '@/hooks/api/useCompetitions';
import { useWebSocket } from '@/hooks/useWebsocket';

const WS_URL = import.meta.env.VITE_WS_URL;

export default function ResultsTab({
    competitionId,
}: {
    competitionId: number;
}) {
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useCompetitionResults(competitionId);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedRound, setSelectedRound] = useState('');

    useWebSocket(`${WS_URL}/ws/results/${competitionId}/`, {
        onMessage: (data) => {
            queryClient.setQueryData(
                ['competitions', competitionId, 'results'],
                (old: unknown) => ({
                    ...(old as object),
                    data: data,
                }),
            );
        },
    });

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

    const categories = data?.data ?? [];

    const categoryOptions = categories.map((c) => ({
        value: c.category.id.toString(),
        label: `${c.category.group.name} ${c.category.gender}`,
    }));

    const roundOptions = [
        ...new Set(
            categories.flatMap((c) => c.rounds.map((r) => r.round_name)),
        ),
    ].map((name) => ({ value: name, label: name }));

    const filteredCategories = selectedCategory
        ? categories.filter(
            (c) => c.category.id.toString() === selectedCategory,
        )
        : categories;

    return (
        <Container variant="tab" className="flex-col">
            <div className="flex gap-4 w-full justify-center">
                <Select
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    options={categoryOptions}
                    placeholder="Allir flokkar"
                />
                <Select
                    value={selectedRound}
                    onChange={setSelectedRound}
                    options={roundOptions}
                    placeholder="Allar umferðir"
                />
            </div>
            <div className="flex flex-col gap-4 w-full">
                {filteredCategories.length === 0 ? (
                    <p className="text-gray-500">
                        Engar niðurstöður skráðar...
                    </p>
                ) : (
                    filteredCategories.map((c) => {
                        const rounds = selectedRound
                            ? c.rounds.filter(
                                (r) => r.round_name === selectedRound,
                            )
                            : c.rounds;
                        if (rounds.length === 0) return null;
                        const label = `${c.category.group.name} ${c.category.gender}`;
                        return (
                            <div
                                key={c.category.id}
                                className="flex flex-col overflow-hidden"
                            >
                                {rounds.map((round) => (
                                    <div key={round.round_name}>
                                        <div className="p-4">
                                            <div className="flex flex-row gap-4">
                                                <h2 className="text-lg font-semibold">
                                                    {label}
                                                </h2>
                                                <h2 className="text-lg text-gray-500">
                                                    {round.round_name}
                                                </h2>
                                            </div>
                                        </div>
                                        <div className="border border-outline rounded-lg overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-outline text-left text-sm text-gray-500">
                                                        <th className="pl-4 py-2 font-normal w-10">
                                                            #
                                                        </th>
                                                        <th className="pl-4 font-normal">
                                                            Nafn
                                                        </th>
                                                        <th className="pl-4 font-normal">
                                                            Leiðir
                                                        </th>
                                                        <th className="px-4 text-right font-normal w-10">
                                                            Stig
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {round.results.map((r) => (
                                                        <ResultCard
                                                            key={r.rank}
                                                            athlete={r}
                                                        />
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })
                )}
            </div>
        </Container>
    );
}
