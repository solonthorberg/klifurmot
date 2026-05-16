import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api';
import Container from '@/components/ui/container';
import ErrorMessage from '@/components/ui/errorMessage';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import SearchBar from '@/components/ui/searchBar';
import Select from '@/components/ui/select';
import { useCategoryGroups } from '@/hooks/api/useCompetitions';
import { useAthletes, useCreateAthlete } from '@/hooks/api/useAthletes';
import AthleteAdminCard from '../cards/athleteAdminCard';
import MainButton from '../ui/mainButton';
import Modal from '../ui/modal';
import { Controller, useForm } from 'react-hook-form';
import {
    createAthleteSchema,
    type CreateAthleteRequest,
} from '@/schemas/athlete';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '../ui/input';

function CreateAthlete({ onClose }: { onClose: () => void }) {
    const { mutate } = useCreateAthlete();
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<CreateAthleteRequest>({
        resolver: zodResolver(createAthleteSchema),
        defaultValues: { is_simple_athlete: true },
    });

    const err = errors as Record<string, { message?: string }>;

    return (
        <Modal onClose={onClose} className="animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">
                Nýr keppandi án aðgang
            </h2>
            <form
                onSubmit={handleSubmit((data) => {
                    mutate(data, { onSuccess: onClose });
                })}
                className="flex flex-col gap-3"
            >
                <>
                    <Input
                        {...register('name')}
                        placeholder="Nafn"
                        error={err.name?.message}
                    />

                    <Input
                        {...register('age' as never, {
                            valueAsNumber: true,
                        })}
                        type="number"
                        placeholder="Aldur"
                        error={err.age?.message}
                    />
                    <Controller
                        name={'gender' as never}
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={[
                                    { value: 'KK', label: 'KK' },
                                    { value: 'KVK', label: 'KVK' },
                                ]}
                                placeholder="Kyn"
                                value={field.value}
                                onChange={field.onChange}
                                error={err.gender?.message}
                            />
                        )}
                    />
                </>
                <MainButton type="submit" className="w-full">
                    Staðfesta
                </MainButton>
            </form>
        </Modal>
    );
}

export default function AthletesAdminTab() {
    const [open, setOpen] = useState(false);
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
            const matchesSearch = (a.name ?? '')
                .toLowerCase()
                .includes(search.toLowerCase());

            const matchesCategory =
                !selectedCategory || a.category === selectedCategory;

            const matchesGender =
                !selectedGender || a.gender === selectedGender;

            const matchesSimple =
                !selectedSimple ||
                String(a.is_simple_athlete) === selectedSimple;

            return (
                matchesSearch &&
                matchesCategory &&
                matchesGender &&
                matchesSimple
            );
        });
    }, [
        athletesData,
        search,
        selectedCategory,
        selectedGender,
        selectedSimple,
    ]);

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
        { value: 'true', label: 'Án aðgang' },
        { value: 'false', label: 'Með aðgang' },
    ];

    return (
        <Container variant="primaryCenter" className="gap-4 max-w-xl">
            <MainButton onClick={() => setOpen(true)} className="w-full">
                + Keppandi
            </MainButton>
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
                        placeholder="Allir"
                        className="flex-1"
                    />
                </div>
            </div>
            <div className="flex flex-col gap-2 w-full">
                {filteredAthletes.length === 0 ? (
                    <p className="text-gray-500 text-center">
                        Engir keppendur fundust...
                    </p>
                ) : (
                    filteredAthletes.map((a) => (
                        <AthleteAdminCard
                            key={a.id}
                            athlete={a}
                            onClick={
                                a.is_simple_athlete
                                    ? undefined
                                    : () => navigate(`/athletes/${a.id}`)
                            }
                        />
                    ))
                )}
            </div>
            {open && <CreateAthlete onClose={() => setOpen(false)} />}
        </Container>
    );
}
