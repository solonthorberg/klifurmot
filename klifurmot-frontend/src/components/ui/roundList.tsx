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
import type { DraftRound } from '@/types/competition';
import RoundItem from './roundItem';

interface RoundListProps {
    rounds: DraftRound[];
    onEdit: (round: DraftRound) => void;
    onDelete: (roundKey: string) => void;
    onReorder: (rounds: DraftRound[]) => void;
}

export default function RoundList({
    rounds,
    onEdit,
    onDelete,
    onReorder,
}: RoundListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = rounds.findIndex((r) => r.key === active.id);
        const newIndex = rounds.findIndex((r) => r.key === over.id);
        const reordered = arrayMove(rounds, oldIndex, newIndex).map((r, i) => ({
            ...r,
            round_order: i + 1,
        }));

        onReorder(reordered);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={rounds.map((r) => r.key)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex flex-col gap-2">
                    {rounds.map((round) => (
                        <RoundItem
                            key={round.key}
                            round={round}
                            onEdit={() => onEdit(round)}
                            onDelete={() => onDelete(round.key)}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
