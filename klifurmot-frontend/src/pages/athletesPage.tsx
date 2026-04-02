import { useState } from 'react';

import { getErrorMessage } from '@/api';
import AthleteCard from '@/components/cards/athleteCard';
import Container from '@/components/ui/container';
import ErrorMessage from '@/components/ui/errorMessage';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import SearchBar from '@/components/ui/searchBar';
import Select from '@/components/ui/select';
import { useAthletes } from '@/hooks/api/useAthletes';
import { useCategoryGroups } from '@/hooks/api/useCompetitions';

export default function AthletesPage() {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedGender, setSelectedGender] = useState('');

    const { data: athletesData, isLoading, error } = useAthletes(search);
    const { data: categoryData } = useCategoryGroups();

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

    const athletes = athletesData?.data ?? [];
    const categoryGroups = categoryData?.data ?? [];

    const categoryOptions = categoryGroups
        .filter((c) => c.is_default)
        .map((c) => ({
            value: c.name,
            label: c.name,
        }));

    const genderOptions = [
        { value: 'KK', label: 'KK' },
        { value: 'KVK', label: 'KVK' },
    ];

    const filteredAthletes = athletes.filter((a) => {
        const matchesSearch = (a.name ?? '')
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesCategory =
            !selectedCategory || a.category === selectedCategory;
        const matchesGender = !selectedGender || a.gender === selectedGender;
        return matchesSearch && matchesCategory && matchesGender;
    });

    return (
        <Container variant="primaryCenter" className="gap-4">
            <h2 className="text-2xl font-semibold">Keppendur</h2>
            <div className="flex gap-4 w-full max-w-2xl">
                <SearchBar value={search} onChange={setSearch} />
                <Select
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    options={categoryOptions}
                    placeholder="Allir flokkar"
                />
                <Select
                    value={selectedGender}
                    onChange={setSelectedGender}
                    options={genderOptions}
                    placeholder="Öll kyn"
                />
            </div>
            <div className="flex flex-col gap-2 w-full max-w-2xl">
                {filteredAthletes.length === 0 ? (
                    <p className="text-gray-500">Engir keppendur fundust...</p>
                ) : (
                    filteredAthletes.map((a) => (
                        <AthleteCard key={a.id} athlete={a} />
                    ))
                )}
            </div>
        </Container>
    );
}
