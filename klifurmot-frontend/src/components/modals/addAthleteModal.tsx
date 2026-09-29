import { useState, useMemo } from 'react';
import Modal from './modal';
import SearchBar from '@/components/ui/searchBar';
import Select from '@/components/ui/select';
import type { AthleteAdmin, Registration } from '@/types';
import TabButton from '../ui/tabButton';
import AddAthleteCard from '../cards/addAthleteCard';
import { useCategoryGroups } from '@/hooks/api/useCompetitions';

interface AddAthleteModalProps {
    allAthletes: AthleteAdmin[];
    registrations: Registration[];
    alreadyAdded: Set<number>;
    onAdd: (climberId: number) => void;
    onClose: () => void;
}

export default function AddAthleteModal({
    allAthletes,
    registrations,
    alreadyAdded,
    onAdd,
    onClose,
}: AddAthleteModalProps) {
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('registered');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedGender, setSelectedGender] = useState('');

    const { data: categoryData } = useCategoryGroups();
    const categoryGroups = categoryData?.data ?? [];

    const tabs = [
        { key: 'registered', label: 'Skráðir' },
        { key: 'all', label: 'Allir' },
    ];

    const categoryOptions = categoryGroups
        .filter((c) => c.is_default)
        .map((c) => ({ value: c.name, label: c.name }));

    const genderOptions = [
        { value: 'KK', label: 'KK' },
        { value: 'KVK', label: 'KVK' },
    ];

    const filteredRegistrations = useMemo(
        () =>
            registrations.filter((r) =>
                (r.climber_name ?? '')
                    .toLowerCase()
                    .includes(search.toLowerCase()),
            ),
        [registrations, search],
    );

    const filteredAllAthletes = useMemo(
        () =>
            allAthletes.filter((a) => {
                const matchesSearch = (a.full_name ?? '')
                    .toLowerCase()
                    .includes(search.toLowerCase());
                const matchesCategory =
                    !selectedCategory || a.category === selectedCategory;
                const matchesGender =
                    !selectedGender || a.gender === selectedGender;
                return matchesSearch && matchesCategory && matchesGender;
            }),
        [allAthletes, search, selectedCategory, selectedGender],
    );

    return (
        <Modal onClose={onClose}>
            <h2 className="text-lg font-semibold mb-4">Bæta við keppanda</h2>
            <div className="flex gap-2 border-b border-outline justify-center w-full overflow-x-auto">
                {tabs.map((t) => (
                    <TabButton
                        className="w-full"
                        key={t.key}
                        active={tab === t.key}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </TabButton>
                ))}
            </div>
            <SearchBar
                value={search}
                onChange={setSearch}
                className="mt-4 w-full"
            />
            {tab === 'all' && (
                <div className="flex gap-2 mt-2 mb-2">
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
                </div>
            )}

            <div className="flex flex-col gap-1 max-h-80 overflow-y-auto mt-2">
                {tab === 'registered' &&
                    (filteredRegistrations.length === 0 ? (
                        <p className="text-gray-500 text-center py-4 text-sm">
                            Engir keppendur skráðir...
                        </p>
                    ) : (
                        filteredRegistrations.map((r) => {
                            const isAdded = alreadyAdded.has(r.climber_id);
                            return (
                                <button
                                    key={r.id}
                                    type="button"
                                    disabled={isAdded}
                                    onClick={() => onAdd(r.climber_id)}
                                    className={`flex flex-col text-left gap-1 border border-outline rounded-lg p-4 hover:shadow-md transition-shadow ${
                                        isAdded
                                            ? 'opacity-50 cursor-not-allowed hover:shadow-none'
                                            : 'cursor-pointer'
                                    }`}
                                >
                                    <div className="flex gap-1 justify-between">
                                        <p>{r.climber_name ?? '-'}</p>
                                        {isAdded && (
                                            <span className="text-sm text-gray-500">
                                                Á ráslista
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-gray-500">
                                        {r.category}
                                    </span>
                                </button>
                            );
                        })
                    ))}

                {tab === 'all' &&
                    (filteredAllAthletes.length === 0 ? (
                        <p className="text-gray-500 text-center py-4 text-sm">
                            Engir keppendur fundust...
                        </p>
                    ) : (
                        filteredAllAthletes.map((a) => {
                            const isAdded = alreadyAdded.has(a.id);
                            return (
                                <AddAthleteCard
                                    key={a.id}
                                    disabled={isAdded}
                                    athlete={a}
                                    onClick={() => onAdd(a.id)}
                                    className={
                                        isAdded
                                            ? 'opacity-50 cursor-not-allowed hover:shadow-none'
                                            : 'cursor-pointer'
                                    }
                                >
                                    {isAdded && (
                                        <span className="text-sm text-gray-500">
                                            Á ráslista
                                        </span>
                                    )}
                                </AddAthleteCard>
                            );
                        })
                    ))}
            </div>
        </Modal>
    );
}
