import { useState } from 'react';

import { getErrorMessage } from '@/api';
import CompetitionCard from '@/components/cards/competitionCard';
import Container from '@/components/ui/container';
import ErrorMessage from '@/components/ui/errorMessage';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import SearchBar from '@/components/ui/searchBar';
import Select from '@/components/ui/select';
import { useCompetitions } from '@/hooks/api/useCompetitions';

export default function CompetitionsPage() {
    const { data, isLoading, error } = useCompetitions();
    const [search, setSearch] = useState('');
    const [year, setYear] = useState('');
    const [eventStatus, setEventStatus] = useState('not_started');

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

    const competitions = data?.data ?? [];

    const yearOptions = [
        ...new Set(
            competitions.map((c) =>
                new Date(c.start_date).getFullYear().toString(),
            ),
        ),
    ]
        .sort((a, b) => b.localeCompare(a))
        .map((y) => ({ value: y, label: y }));

    const statusOptions = [
        { value: 'ongoing', label: 'Í gangi' },
        { value: 'not_started', label: 'Væntanlegt' },
        { value: 'finished', label: 'Lokið' },
    ];

    const filteredCompetitions = competitions.filter((c) => {
        const matchesSearch = c.title
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesYear = !year || c.start_date.startsWith(year);
        const matchesStatus = !eventStatus || c.status === eventStatus;
        return matchesSearch && matchesYear && matchesStatus;
    });

    return (
        <Container variant="primaryCenter" className="gap-4">
            <h2 className="text-2xl font-semibold">Mót</h2>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-3xl">
                <SearchBar
                    className="w-full sm:flex-1"
                    value={search}
                    onChange={setSearch}
                />
                <div className="flex gap-4 w-full sm:w-auto">
                    <Select
                        value={eventStatus}
                        onChange={setEventStatus}
                        options={statusOptions}
                        placeholder="Staða"
                        className="flex-1 sm:flex-none"
                    />
                    <Select
                        value={year}
                        onChange={setYear}
                        options={yearOptions}
                        placeholder="Ár"
                        className="flex-1 sm:flex-none"
                    />
                </div>
            </div>
            <div className="flex flex-col gap-4 w-full max-w-3xl">
                {filteredCompetitions.length === 0 ? (
                    <p className="text-gray-500 text-center">
                        Engin mót fundust...
                    </p>
                ) : (
                    filteredCompetitions.map((c) => (
                        <CompetitionCard key={c.id} competition={c} />
                    ))
                )}
            </div>
        </Container>
    );
}
