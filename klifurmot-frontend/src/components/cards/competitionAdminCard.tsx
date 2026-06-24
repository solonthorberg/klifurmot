import { useNavigate } from 'react-router-dom';
import Image from '@/components/ui/image';
import type { Competition } from '@/types';
import MainButton from '../ui/mainButton';
import Icon from '../ui/icons';

export default function CompetitionAdminCard({
    competition,
    onDelete,
}: {
    competition: Competition;
    onDelete: () => void;
}) {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`${competition.id}`)}
            className={`flex sm:flex-row flex-col relative w-full sm:h-40 rounded-lg overflow-hidden hover:shadow-md transition-shadow border border-outline cursor-pointer`}
        >
            <Image
                image={competition.image}
                alt={competition.title}
                className="w-full sm:w-48 h-40 sm:h-full shrink-0"
            />
            <div className="p-4 flex flex-col gap-1 flex-1 min-w-0">
                <h2 className="font-semibold text-lg">{competition.title}</h2>
                <p className="text-gray-600 text-sm">{competition.location}</p>
                <p className="text-gray-500 text-sm">
                    {new Date(competition.start_date).toLocaleDateString(
                        'is-IS',
                    )}{' '}
                    -{' '}
                    {new Date(competition.end_date).toLocaleDateString('is-IS')}
                </p>
                <p className="text-gray-500 text-sm">
                    {`Stofnandi: ${competition.created_by}`}
                </p>
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex gap-2 mt-2 sm:absolute sm:right-4 sm:top-2"
                >
                    <MainButton
                        className="flex-1 sm:flex-none"
                        square
                        title="Breyta móti"
                        onClick={() =>
                            navigate(
                                `/admin-panel/${competition.id}/edit-competition`,
                            )
                        }
                    >
                        <Icon variant="edit" />
                    </MainButton>
                    <MainButton
                        className="flex-1 sm:flex-none"
                        onClick={onDelete}
                        square
                        variant="delete"
                        title="Eyða móti"
                    >
                        <Icon variant="trash" />
                    </MainButton>
                </div>
            </div>
        </div>
    );
}
