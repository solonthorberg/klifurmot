import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api';
import Container from '@/components/ui/container';
import ErrorMessage from '@/components/ui/errorMessage';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import SearchBar from '@/components/ui/searchBar';
import Select from '@/components/ui/select';
import { useCategoryGroups } from '@/hooks/api/useCompetitions';
import { useAthletes } from '@/hooks/api/useAthletes';
import AthleteAdminCard from '../cards/athleteAdminCard';

export default function AthletesAdminTab() {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedGender, setSelectedGender] = useState('');
    const [selectedSimple, setSelectedSimple] = useState('');
    const navigate = useNavigate();
    const { data: athletesData, isLoading, error } = useAthletes();
    const { data: categoryData } = useCategoryGroups();
    const categoryGroups = categoryData?.data ?? [];

    const filteredAthletes = useMemo(() => {
        const list = athletesData?.data ?? [];
        return list.filter((a) => {
            const name = a.is_simple_athlete
                ? a.simple_name
                : a.user_account?.full_name;

            const gender = a.is_simple_athlete
                ? a.simple_gender
                : a.user_account?.gender;

            const matchesSearch = (name ?? '')
                .toLowerCase()
                .includes(search.toLowerCase());

            const matchesGender = !selectedGender || gender === selectedGender;

            const matchesSimple =
                !selectedSimple ||
                String(a.is_simple_athlete) === selectedSimple;

            return matchesSearch && matchesGender && matchesSimple;
        });
    }, [athletesData, search, selectedGender, selectedSimple]);

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

    const simpleOptions = [
        { value: 'true', label: 'Gestkeppandi' },
        { value: 'false', label: 'Skráður keppandi' },
    ];

    return (
        <Container variant="primaryCenter" className="gap-4 max-w-xl">
            <div className="flex flex-col gap-4 w-full">
                <SearchBar
                    className="w-full sm:flex-1"
                    value={search}
                    onChange={setSearch}
                />
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Select
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        options={categoryOptions}
                        placeholder="Allir flokkar"
                        className="flex-1"
                    />
                    <Select
                        value={selectedGender}
                        onChange={setSelectedGender}
                        options={genderOptions}
                        placeholder="Öll kyn"
                        className="flex-1"
                    />
                    <Select
                        value={selectedSimple}
                        onChange={setSelectedSimple}
                        options={simpleOptions}
                        placeholder="Allir keppendur"
                        className="flex-1"
                    />
                </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-2xl animate-fade-in">
                {filteredAthletes.length === 0 ? (
                    <p className="text-gray-500">Engir keppendur fundust...</p>
                ) : (
                    filteredAthletes.map((a) => (
                        <AthleteAdminCard
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
