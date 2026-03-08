import { useState } from 'react';

import AthleteCard from '../cards/athleteCard';
import Container from '../ui/container';
import ErrorMessage from '../ui/errorMessage';
import LoadingSpinner from '../ui/loadingSpinner';
import SearchBar from '../ui/searchBar';
import Select from '../ui/select';

import { getErrorMessage } from '@/api';
import { useCompetitionAthletes } from '@/hooks/api/useCompetitions';

export default function AthletesTab({
    competitionId,
}: {
    competitionId: number;
}) {
    const { data, isLoading, error } = useCompetitionAthletes(competitionId);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

    const categories = data?.data?.categories ?? {};
    const categoryNames = Object.keys(categories);

    const categoryOptions = categoryNames.map((name) => ({
        value: name,
        label: name,
    }));

    const allAthletes = selectedCategory
        ? (categories[selectedCategory] ?? [])
        : categoryNames.flatMap((name) => categories[name]);

    const filteredAthletes = allAthletes.filter((a) =>
        (a.full_name ?? '').toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <Container variant="tab" className="flex-col">
            <div className="flex gap-4 w-full">
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Leita að keppanda..."
                />
                <Select
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    options={categoryOptions}
                    placeholder="Allir flokkar"
                />
            </div>
            <div className="flex flex-col gap-4 w-full">
                {filteredAthletes.length === 0 ? (
                    <p className="text-gray-500">Engir keppendur skráðir...</p>
                ) : (
                    categoryNames
                        .filter(
                            (name) =>
                                !selectedCategory || name === selectedCategory,
                        )
                        .map((name) => {
                            const athletes = (categories[name] ?? []).filter(
                                (a) =>
                                    (a.full_name ?? '')
                                        .toLowerCase()
                                        .includes(search.toLowerCase()),
                            );
                            if (athletes.length === 0) return null;
                            return (
                                <div
                                    key={name}
                                    className="flex flex-col overflow-hidden"
                                >
                                    <div className="flex justify-between items-center p-4">
                                        <h2 className="text-lg font-semibold">
                                            {name}
                                        </h2>
                                        <span className="text-lg text-gray-500">
                                            Keppendur: {athletes.length}
                                        </span>
                                    </div>
                                    <div className="border border-outline rounded-lg">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-outline text-left text-sm text-gray-500">
                                                    <th className="px-4 py-2 font-normal">
                                                        Nafn
                                                    </th>
                                                    <th className="px-4 py-2 font-normal">
                                                        Flokkur
                                                    </th>
                                                    <th className="px-4 py-2 font-normal">
                                                        Kyn
                                                    </th>
                                                    <th className="px-4 py-2 font-normal text-right">
                                                        Þjóðerni
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {athletes.map((a) => (
                                                    <AthleteCard
                                                        key={a.id}
                                                        athlete={a}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>
        </Container>
    );
}
