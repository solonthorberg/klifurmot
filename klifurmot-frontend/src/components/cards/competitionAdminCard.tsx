import { useNavigate } from 'react-router-dom';
import Image from '@/components/ui/image';

import type { Competition } from '@/types';
import MainButton from '../ui/mainButton';
import { useAuthStore } from '@/stores';
import Icon from '../ui/icons';

export default function CompetitionAdminCard({
    competition,
    onDelete,
}: {
    competition: Competition;
    onDelete: () => void;
}) {
    const { userAccount } = useAuthStore();
    const navigate = useNavigate();
    return (
        <div className="flex sm:flex-row flex-col relative w-full sm:h-40 rounded-lg overflow-hidden hover:shadow-md transition-shadow border border-outline">
            <Image
                image={competition.image}
                alt={competition.title}
                className="w-full sm:w-48 h-40 sm:h-full shrink-0 cursor-pointer"
                onClick={() => navigate(`${competition.id}`)}
            />
            <div className="p-4 flex flex-col gap-1">
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
                {competition.created_by === userAccount?.user.username && (
                    <div className="absolute right-4 z-5 flex gap-1">
                        <MainButton
                            onClick={() => {
                                navigate(
                                    `/admin-panel/${competition.id}/edit-competition`,
                                );
                            }}
                        >
                            Breyta
                        </MainButton>
                        <MainButton
                            className="px-2"
                            onClick={onDelete}
                            square={true}
                            variant="delete"
                        >
                            <Icon variant="trash" />
                        </MainButton>
                    </div>
                )}
            </div>
        </div>
    );
}
