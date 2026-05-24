import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api';
import Container from '@/components/ui/container';
import ErrorMessage from '@/components/ui/errorMessage';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import SearchBar from '@/components/ui/searchBar';
import Select from '@/components/ui/select';
import { useCategoryGroups } from '@/hooks/api/useCompetitions';
import {
    useAthletes,
    useCreateAthlete,
    useCreateAthleteForUser,
    useLinkAthlete,
} from '@/hooks/api/useAthletes';
import AthleteAdminCard from '../cards/athleteAdminCard';
import MainButton from '../ui/mainButton';
import Modal from '../modals/modal';
import { Controller, useForm } from 'react-hook-form';
import {
    CreateAthleteSchema,
    type CreateAthleteFormData,
} from '@/schemas/athlete';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '../ui/input';
import type { AthleteAdmin } from '@/types';
import { useUserAccounts } from '@/hooks/api/useAccounts';
import TabButton from '../ui/tabButton';

function AddAthleteModal({ onClose }: { onClose: () => void }) {
    const [tab, setTab] = useState<'simple' | 'account'>('simple');
    const [search, setSearch] = useState('');

    const { mutate: createAthlete } = useCreateAthlete();
    const { mutate: createForUser, isPending } = useCreateAthleteForUser();
    const { data: usersData } = useUserAccounts();
    const { data: athletesData } = useAthletes();

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<CreateAthleteFormData>({
        resolver: zodResolver(CreateAthleteSchema),
        defaultValues: { is_simple_athlete: true },
    });

    const users = usersData?.data ?? [];

    const usersWithClimber = useMemo(() => {
        const list = athletesData?.data ?? [];
        return new Set(
            list
                .filter((a) => !a.is_simple_athlete && a.user_account_id)
                .map((a) => a.user_account_id),
        );
    }, [athletesData]);

    const filteredUsers = users.filter((u) => {
        if (usersWithClimber.has(u.id)) return false;
        const name = (u.full_name ?? u.username).toLowerCase();
        const email = u.email.toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || email.includes(q);
    });

    return (
        <Modal onClose={onClose} className="animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">+ Keppandi</h2>
            <div className="flex gap-2 border-b border-outline mb-4">
                <TabButton
                    active={tab === 'simple'}
                    onClick={() => setTab('simple')}
                    className="flex-1"
                >
                    Án aðgang
                </TabButton>
                <TabButton
                    active={tab === 'account'}
                    onClick={() => setTab('account')}
                    className="flex-1"
                >
                    Með aðgang
                </TabButton>
            </div>

            {tab === 'simple' && (
                <form
                    onSubmit={handleSubmit((data) => {
                        createAthlete(data, { onSuccess: onClose });
                    })}
                    className="flex flex-col gap-4"
                >
                    <Input
                        {...register('name')}
                        placeholder="Nafn"
                        error={errors.name?.message}
                    />
                    <Input
                        {...register('age' as never, { valueAsNumber: true })}
                        type="number"
                        placeholder="Aldur"
                        error={errors.age?.message}
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
                                inputClassName="bg-white"
                                error={errors.gender?.message}
                            />
                        )}
                    />
                    <MainButton type="submit" className="w-full">
                        Staðfesta
                    </MainButton>
                </form>
            )}

            {tab === 'account' && (
                <div className="flex flex-col gap-3">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        className="w-full"
                    />
                    <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
                        {filteredUsers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                                Engir notendur fundust...
                            </p>
                        ) : (
                            filteredUsers.map((u) => (
                                <button
                                    key={u.id}
                                    type="button"
                                    disabled={isPending}
                                    onClick={() =>
                                        createForUser(u.id, {
                                            onSuccess: onClose,
                                        })
                                    }
                                    className="flex flex-col px-4 py-3 rounded-lg border border-outline text-left hover:bg-primary-light transition-colors w-full disabled:opacity-50"
                                >
                                    <span className="font-medium text-sm">
                                        {u.full_name ?? u.username}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {u.email}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}

function LinkAthleteModal({
    athlete,
    onClose,
}: {
    athlete: AthleteAdmin;
    onClose: () => void;
}) {
    const [search, setSearch] = useState('');
    const { mutate: linkAthlete, isPending } = useLinkAthlete();
    const { data: usersData } = useUserAccounts();
    const { data: athletesData } = useAthletes();
    const users = usersData?.data ?? [];

    const usersWithClimber = useMemo(() => {
        const list = athletesData?.data ?? [];
        return new Set(
            list
                .filter((a) => !a.is_simple_athlete && a.user_account_id)
                .map((a) => a.user_account_id),
        );
    }, [athletesData]);

    const filtered = users.filter((u) => {
        if (usersWithClimber.has(u.id)) return false;
        const name = (u.full_name ?? u.username).toLowerCase();
        const email = u.email.toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || email.includes(q);
    });

    const handleLink = (userAccountId: number) => {
        linkAthlete(
            { climberId: athlete.id, userAccountId },
            { onSuccess: onClose },
        );
    };

    return (
        <Modal onClose={onClose}>
            <h2 className="text-lg font-semibold mb-1">Tengja við aðgang</h2>
            <p className="text-sm text-gray-500 mb-4">
                Tengja <span className="font-medium">{athlete.name}</span> við
                notendaaðgang
            </p>
            <SearchBar
                value={search}
                onChange={setSearch}
                className="mb-3 w-full"
            />
            <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
                {filtered.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                        Engir notendur fundust...
                    </p>
                ) : (
                    filtered.map((u) => (
                        <button
                            key={u.id}
                            type="button"
                            disabled={isPending}
                            onClick={() => handleLink(u.id)}
                            className="flex flex-col px-4 py-3 rounded-lg border border-outline text-left hover:bg-primary-light transition-colors w-full disabled:opacity-50"
                        >
                            <span className="font-medium text-sm">
                                {u.full_name ?? u.username}
                            </span>
                            <span className="text-xs text-gray-500">
                                {u.email}
                            </span>
                        </button>
                    ))
                )}
            </div>
        </Modal>
    );
}

export default function AthletesAdminTab() {
    const [open, setOpen] = useState(false);
    const [linkTarget, setLinkTarget] = useState<AthleteAdmin | null>(null);
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
        .map((c) => ({ value: c.name, label: c.name }));

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
            <div className="flex flex-col gap-2 w-full overflow-y-auto h-120">
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
                            onLink={
                                a.is_simple_athlete
                                    ? () => setLinkTarget(a)
                                    : undefined
                            }
                        />
                    ))
                )}
            </div>
            {open && <AddAthleteModal onClose={() => setOpen(false)} />}
            {linkTarget && (
                <LinkAthleteModal
                    athlete={linkTarget}
                    onClose={() => setLinkTarget(null)}
                />
            )}
        </Container>
    );
}
