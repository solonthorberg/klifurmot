import type { DraftCategory, DraftRound } from '@/types/competition';
import MainButton from '@/components/ui/mainButton';
import RoundList from '../ui/roundList';
import Icon from '../ui/icons';

interface CategoryCardProps {
    category: DraftCategory;
    onDelete: () => void;
    onAddRound: () => void;
    onEditRound: (round: DraftRound) => void;
    onDeleteRound: (roundKey: string) => void;
    onReorderRounds: (rounds: DraftRound[]) => void;
}

export default function CategoryCard({
    category,
    onDelete,
    onAddRound,
    onEditRound,
    onDeleteRound,
    onReorderRounds,
}: CategoryCardProps) {
    const genderLabel = category.gender === 'KK' ? 'KK' : 'KVK';

    return (
        <div className="border border-outline rounded-lg p-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
                <div className="flex flex-col">
                    <div>
                        <span className="font-semibold text-lg mr-1">
                            {category.category_group_name}
                        </span>
                        <span>{`- ${genderLabel}`}</span>
                    </div>
                    <span className="text-sm text-secondary">
                        {category.rounds.length} umferðir
                    </span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <MainButton
                        className="w-full sm:w-fit"
                        variant="outline"
                        type="button"
                        onClick={onAddRound}
                    >
                        + Umferð
                    </MainButton>
                    <MainButton
                        className="w-full sm:w-10"
                        variant="delete"
                        type="button"
                        square
                        onClick={onDelete}
                    >
                        <Icon variant="trash" />
                    </MainButton>
                </div>
            </div>
            {category.rounds.length > 0 && (
                <RoundList
                    rounds={category.rounds}
                    onEdit={onEditRound}
                    onDelete={onDeleteRound}
                    onReorder={onReorderRounds}
                />
            )}
        </div>
    );
}
