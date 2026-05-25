import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    TouchSensor,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
    Round,
    Registration,
    StartlistEntry,
    AthleteAdmin,
} from '@/types';
import {
    useStartlist,
    useAddToStartlist,
    useAdvanceClimbers,
    useReorderStartlist,
} from '@/hooks/api/useScoring';
import { useUpdateRoundStatus } from '@/hooks/api/useCompetitions';
import { scoringApi } from '@/api';
import MainButton from '@/components/ui/mainButton';
import Icon from '@/components/ui/icons';
import AddAthleteModal from '@/components/modals/addAthleteModal';
import Modal from '@/components/modals/modal';

interface RoundStartlistCardProps {
    round: Round;
    registrations: Registration[];
    allAthletes: AthleteAdmin[];
    isLastRound: boolean;
}

interface SortableRowProps {
    entry: StartlistEntry;
    onRemove: (entry: StartlistEntry) => void;
}

function SortableRow({ entry, onRemove }: SortableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: entry.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <tr
            ref={setNodeRef}
            style={style}
            className="border-b border-outline last:border-0"
        >
            <td className="pl-2 py-2 w-8">
                <button
                    type="button"
                    className="cursor-grab text-secondary hover:text-primary"
                    {...attributes}
                    {...listeners}
                >
                    ⠿
                </button>
            </td>
            <td className="px-2 py-2 w-10 text-center font-medium text-sm">
                {entry.start_order}
            </td>
            <td className="px-2 py-2 text-sm">{entry.climber_name ?? '-'}</td>
            <td className="pr-2 py-2 w-10 text-right">
                <MainButton
                    variant="delete"
                    size="small"
                    square
                    onClick={() => onRemove(entry)}
                >
                    <Icon variant="trash" size={14} />
                </MainButton>
            </td>
        </tr>
    );
}

interface RemoveAthleteModalProps {
    entry: StartlistEntry;
    onConfirm: () => void;
    onClose: () => void;
}

function RemoveAthleteModal({
    entry,
    onConfirm,
    onClose,
}: RemoveAthleteModalProps) {
    return (
        <Modal onClose={onClose}>
            <h2 className="text-lg font-semibold mb-4">Fjarlægja keppanda?</h2>
            <p>
                Ertu viss að þú viljir fjarlægja{' '}
                <span className="font-medium">
                    {entry.climber_name ?? 'þennan keppanda'}
                </span>
                {'?'}
            </p>
            <div className="flex justify-between gap-2 mt-4">
                <MainButton
                    variant="delete"
                    square
                    className="w-full"
                    onClick={onConfirm}
                >
                    Fjarlægja
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

export default function RoundStartlistCard({
    round,
    registrations,
    allAthletes,
    isLastRound,
}: RoundStartlistCardProps) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [removeTarget, setRemoveTarget] = useState<StartlistEntry | null>(
        null,
    );
    const [localEntries, setLocalEntries] = useState<StartlistEntry[]>([]);
    const isDraggingRef = useRef(false);
    const queryClient = useQueryClient();
    const { data: startlistData } = useStartlist(round.id);
    const { mutate: addToStartlist } = useAddToStartlist();
    const { mutate: advanceClimbers } = useAdvanceClimbers();
    const { mutate: updateRoundStatus } = useUpdateRoundStatus();
    const { mutateAsync: reorderStartlist } = useReorderStartlist();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
    );

    useEffect(() => {
        if (!isDraggingRef.current) {
            setLocalEntries(startlistData?.data ?? []);
        }
    }, [startlistData]);

    const handleDragStart = () => {
        isDraggingRef.current = true;
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        isDraggingRef.current = false;
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = localEntries.findIndex((e) => e.id === active.id);
        const newIndex = localEntries.findIndex((e) => e.id === over.id);
        const reordered = arrayMove(localEntries, oldIndex, newIndex).map(
            (e, i) => ({ ...e, start_order: i + 1 }),
        );
        setLocalEntries(reordered);
        await reorderStartlist({
            round_id: round.id,
            entries: reordered.map((e) => ({
                id: e.id,
                start_order: e.start_order,
            })),
        });
    };

    const handleAdd = (climberId: number) => {
        addToStartlist({
            round: round.id,
            climber: climberId,
            start_order: localEntries.length + 1,
        });
        setShowAddModal(false);
    };

    const handleConfirmRemove = async () => {
        if (!removeTarget) return;
        await scoringApi.removeFromStartlist(removeTarget.id);
        const reordered = localEntries
            .filter((e) => e.id !== removeTarget.id)
            .map((e, i) => ({ ...e, start_order: i + 1 }));
        setLocalEntries(reordered);
        if (reordered.length > 0) {
            await reorderStartlist({
                round_id: round.id,
                entries: reordered.map((e) => ({
                    id: e.id,
                    start_order: e.start_order,
                })),
            });
        } else {
            queryClient.invalidateQueries({
                queryKey: ['startlist', round.id],
            });
        }
        setRemoveTarget(null);
    };

    const handleAdvance = () => {
        advanceClimbers(round.id);
    };

    const handleToggleCompleted = () => {
        updateRoundStatus({ roundId: round.id, completed: !round.completed });
    };

    const categoryLabel = `${round.category_group_name} ${round.gender}`;
    const categoryRegistrations = registrations.filter(
        (r) => r.category === categoryLabel,
    );

    const alreadyInStartlist = new Set(localEntries.map((e) => e.climber_id));

    return (
        <div className="border border-outline rounded-lg p-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <h3 className="font-semibold text-lg">{categoryLabel}</h3>
                    <span className="text-sm text-gray-500">
                        {localEntries.length} skráðir
                        {round.climbers_advance
                            ? ` - ${round.climbers_advance} keppendur`
                            : ''}
                    </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <MainButton
                        size="small"
                        variant="outline"
                        onClick={() => setShowAddModal(true)}
                        disabled={round.completed}
                    >
                        + Keppandi
                    </MainButton>
                    <MainButton
                        size="small"
                        variant={round.completed ? 'primary' : 'outline'}
                        onClick={handleToggleCompleted}
                    >
                        {round.completed ? 'Lokið' : 'Merkja lokið'}
                    </MainButton>
                    {!isLastRound && (
                        <MainButton
                            size="small"
                            onClick={handleAdvance}
                            disabled={!round.completed}
                        >
                            Flytja í næstu umferð
                        </MainButton>
                    )}
                </div>
            </div>
            {localEntries.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                    Engir keppendur skráðir...
                </p>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="border border-outline rounded-lg overflow-hidden max-h-100 overflow-y-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-background">
                                <tr className="border-b border-outline text-left text-sm text-gray-500">
                                    <th className="pl-2 py-2 w-8"></th>
                                    <th className="px-2 py-2 w-10 text-center font-normal">
                                        #
                                    </th>
                                    <th className="px-2 py-2 font-normal">
                                        Nafn
                                    </th>
                                    <th className="pr-2 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <SortableContext
                                    items={localEntries.map((e) => e.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {localEntries.map((entry) => (
                                        <SortableRow
                                            key={entry.id}
                                            entry={entry}
                                            onRemove={setRemoveTarget}
                                        />
                                    ))}
                                </SortableContext>
                            </tbody>
                        </table>
                    </div>
                </DndContext>
            )}
            {removeTarget && (
                <RemoveAthleteModal
                    entry={removeTarget}
                    onConfirm={handleConfirmRemove}
                    onClose={() => setRemoveTarget(null)}
                />
            )}
            {showAddModal && (
                <AddAthleteModal
                    allAthletes={allAthletes}
                    registrations={categoryRegistrations}
                    alreadyAdded={alreadyInStartlist}
                    onAdd={handleAdd}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
}
