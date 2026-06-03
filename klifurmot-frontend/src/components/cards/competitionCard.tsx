import { Link } from 'react-router-dom';
import Image from '@/components/ui/image';

import type { Competition } from '@/types';
import LivePill from '../ui/livePill';

export default function CompetitionCard({
    competition,
}: {
    competition: Competition;
}) {
    return (
        <Link
            to={`/competitions/${competition.id}`}
            className="flex sm:flex-row relative flex-col w-full sm:h-40 rounded-lg overflow-hidden hover:shadow-md transition-shadow border border-outline animate-fade-in"
        >
            <Image
                image={competition.image}
                alt={competition.title}
                className="w-full sm:w-48 h-40 sm:h-full shrink-0"
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
            </div>
            {competition.status === 'ongoing' && (
                <div className="absolute top-4 right-4 rounded-full">
                    <LivePill />
                </div>
            )}
        </Link>
    );
}
