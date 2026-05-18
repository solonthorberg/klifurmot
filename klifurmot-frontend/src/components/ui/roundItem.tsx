import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MainButton from './mainButton';
import type { DraftRound } from '@/types';
import Icon from './icons';

interface RoundItemProps {
    round: DraftRound;
    onEdit: () => void;
    onDelete: () => void;
}

export default function RoundItem({ round, onEdit, onDelete }: RoundItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: round.key,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex flex-col sm:flex-row gap-2 items-center justify-between border border-outline rounded-lg px-4 py-3 bg-white ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
                <button
                    type="button"
                    className="cursor-grab text-secondary hover:text-primary"
                    {...attributes}
                    {...listeners}
                >
                    ⠿
                </button>
                <div className="flex flex-col">
                    <span className="font-medium text-sm">
                        {`${round.round_order}. ${round.round_group_name}`}
                    </span>
                    <span className="text-xs text-secondary">
                        {round.boulder_count} leiðir
                        {round.climbers_advance
                            ? ` - ${round.climbers_advance} fara áfram í næstu umferð fyrir neðan`
                            : ''}
                        {round.is_self_scoring ? ' · Self scoring' : ''}
                    </span>
                </div>
            </div>
            <div className="flex gap-2 sm:w-auto w-full">
                <MainButton
                    className="w-full sm:w-auto"
                    size="small"
                    variant="outline"
                    type="button"
                    onClick={onEdit}
                >
                    Breyta
                </MainButton>
                <MainButton
                    className="w-full sm:w-auto"
                    size="small"
                    variant="delete"
                    type="button"
                    onClick={onDelete}
                >
                    <Icon variant="trash" size={16} />
                </MainButton>
            </div>
        </div>
    );
}
