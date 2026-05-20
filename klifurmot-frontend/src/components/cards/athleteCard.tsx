import type { PublicAthlete } from '@/types';

interface AthleteCardProps {
    athlete: PublicAthlete;
    onClick?: () => Promise<void> | void;
}

export default function AthleteCard({ athlete, onClick }: AthleteCardProps) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col cursor-pointer text-left gap-1 border border-outline rounded-lg p-4 hover:shadow-md transition-shadow"
        >
            <p>{athlete.name}</p>
            <div className="flex gap-4 text-gray-500">
                <span>{`${athlete.age} ára`}</span>
            </div>
        </button>
    );
}
