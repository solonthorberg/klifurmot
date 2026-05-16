import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { getErrorMessage } from '@/api';
import AthleteCard from '@/components/cards/athleteCard';
import Container from '@/components/ui/container';
import ErrorMessage from '@/components/ui/errorMessage';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import SearchBar from '@/components/ui/searchBar';
import Select from '@/components/ui/select';
import { usePublicAthletes } from '@/hooks/api/useAthletes';
import { useCategoryGroups } from '@/hooks/api/useCompetitions';
import type { PublicAthlete } from '@/types/athlete';

export default function AthletesPage() {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedGender, setSelectedGender] = useState('');

    const navigate = useNavigate();

    const { data: athletesData, isLoading, error } = usePublicAthletes();
    const { data: categoryData } = useCategoryGroups();

    const athletes = (athletesData?.data as PublicAthlete[]) ?? [];
    const categoryGroups = categoryData?.data ?? [];

    const filteredAthletes = useMemo(() => {
        const list = athletesData?.data ?? [];
        return list.filter((a) => {
            const matchesSearch = (a.name ?? '')
                .toLowerCase()
                .includes(search.toLowerCase());
            const matchesCategory =
                !selectedCategory || a.category === selectedCategory;
            const matchesGender =
                !selectedGender || a.gender === selectedGender;
            return matchesSearch && matchesCategory && matchesGender;
        });
    }, [athletes, search, selectedCategory, selectedGender]);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;

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

    return (
        <Container variant="primaryCenter" className="gap-4">
            <h2 className="text-2xl font-semibold">Keppendur</h2>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
                <SearchBar
                    className="w-full sm:flex-1"
                    value={search}
                    onChange={setSearch}
                />
                <div className="flex gap-4 w-full sm:w-auto">
                    <Select
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        options={categoryOptions}
                        placeholder="Allir flokkar"
                        className="flex-1 sm:flex-none"
                    />
                    <Select
                        value={selectedGender}
                        onChange={setSelectedGender}
                        options={genderOptions}
                        placeholder="Öll kyn"
                        className="flex-1 sm:flex-none"
                    />
                </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-2xl animate-fade-in">
                {filteredAthletes.length === 0 ? (
                    <p className="text-gray-500 text-center">
                        Engir keppendur fundust...
                    </p>
                ) : (
                    filteredAthletes.map((a) => (
                        <AthleteCard
                            key={a.id}
                            athlete={a}
                            onClick={() => navigate(`/athletes/${a.id}`)}
                        />
                    ))
                )}
            </div>
        </Container>
    );
}
