import { getErrorMessage } from '@/api';
import ErrorMessage from '@/components/ui/errorMessage';
import LoadingSpinner from '@/components/ui/loadingSpinner';
import SearchBar from '@/components/ui/searchBar';
import Select from '@/components/ui/select';
import {
    useCompetitions,
    useDeleteCompetition,
} from '@/hooks/api/useCompetitions';
import { useState } from 'react';
import Container from '../ui/container';
import CompetitionAdminCard from '../cards/competitionAdminCard';
import MainButton from '../ui/mainButton';
import { useNavigate } from 'react-router-dom';
import Modal from '../modals/modal';

export default function CompetitionAdminTab() {
    const { data, isLoading, error } = useCompetitions();
    const { mutate } = useDeleteCompetition();
    const [search, setSearch] = useState('');
    const [year, setYear] = useState('');
    const [eventStatus, setEventStatus] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const navigate = useNavigate();

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

    function confirmDelete() {
        if (deleteTarget !== null) {
            mutate(deleteTarget);
            setDeleteTarget(null);
        }
    }

    function DeleteCompetition({ onClose }: { onClose: () => void }) {
        return (
            <Modal onClose={onClose}>
                <h2 className="text-lg font-semibold mb-4">Eyða mót?</h2>
                <p>Niðurstöður, skráningar og fleira verður eytt.</p>
                <div className="flex justify-between gap-2 mt-4">
                    <MainButton
                        variant="delete"
                        square={true}
                        className="w-full"
                        onClick={confirmDelete}
                    >
                        Eyða
                    </MainButton>
                    <MainButton
                        variant="outline"
                        className="w-full"
                        onClick={onClose}
                    >
                        Hætta við
                    </MainButton>
                </div>
            </Modal>
        );
    }

    return (
        <Container variant="primaryCenter" className="gap-4">
            {deleteTarget !== null && (
                <DeleteCompetition onClose={() => setDeleteTarget(null)} />
            )}
            <div className="flex flex-col gap-4 w-full max-w-lg">
                <MainButton
                    onClick={() => navigate('/admin-panel/create-competition')}
                >
                    + Mót
                </MainButton>
            </div>
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
                        <CompetitionAdminCard
                            key={c.id}
                            competition={c}
                            onDelete={() => setDeleteTarget(c.id)}
                        />
                    ))
                )}
            </div>
        </Container>
    );
}
