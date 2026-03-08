import { useState } from 'react';

import StartlistCard from '../cards/startlistCard';
import Container from '../ui/container';
import ErrorMessage from '../ui/errorMessage';
import LoadingSpinner from '../ui/loadingSpinner';
import Select from '../ui/select';

import { getErrorMessage } from '@/api';
import { useCompetitionStartlist } from '@/hooks/api/useCompetitions';

export default function StartlistTab({
    competitionId,
}: {
    competitionId: number;
}) {
    const { data, isLoading, error } = useCompetitionStartlist(competitionId);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedRound, setSelectedRound] = useState('');

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

    const categories = data?.data ?? [];

    const categoryOptions = categories.map((c) => ({
        value: c.category,
        label: c.category,
    }));

    const roundOptions = [
        ...new Set(
            categories.flatMap((c) => c.rounds.map((r) => r.round_name)),
        ),
    ].map((name) => ({ value: name, label: name }));

    const filteredCategories = selectedCategory
        ? categories.filter((c) => c.category === selectedCategory)
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
                    <p>Engar leiðir skráðar...</p>
                ) : (
                    filteredCategories.map((c) => {
                        const rounds = selectedRound
                            ? c.rounds.filter(
                                (r) => r.round_name === selectedRound,
                            )
                            : c.rounds;
                        if (rounds.length === 0) return null;
                        return (
                            <div
                                key={c.category}
                                className="flex flex-col overflow-hidden"
                            >
                                {rounds.map((round) => (
                                    <div key={round.round_name}>
                                        <div className="flex justify-between items-end p-4">
                                            <div className="flex flex-wrap gap-4">
                                                <h2 className="text-lg font-semibold">
                                                    {c.category}
                                                </h2>
                                                <h2 className="text-lg text-gray-500 pr-8">
                                                    {round.round_name}
                                                </h2>
                                            </div>
                                            <span className="text-lg text-gray-500 whitespace-nowrap">
                                                Keppendur:{' '}
                                                {round.athletes.length}
                                            </span>
                                        </div>
                                        <div className="border border-outline rounded-lg">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-outline text-left text-sm text-gray-500">
                                                        <th className="pl-4 py-2 font-normal w-10">
                                                            #
                                                        </th>
                                                        <th className="pl-4 font-normal">
                                                            Nafn
                                                        </th>
                                                        <th className="px-4 text-right font-normal w-10">
                                                            Flokkur
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {round.athletes.map((a) => (
                                                        <StartlistCard
                                                            key={a.start_order}
                                                            athlete={a}
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
