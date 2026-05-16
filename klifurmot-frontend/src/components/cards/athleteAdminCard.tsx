import type { AthleteAdmin } from '@/types';

interface AthleteCardProps {
    athlete: AthleteAdmin;
    onClick?: () => void;
}

export default function AthleteCard({ athlete, onClick }: AthleteCardProps) {
    return (
        <button
            onClick={onClick}
            className="flex items-center justify-between cursor-pointer text-left gap-1 border border-outline rounded-lg p-4 hover:shadow-md transition-shadow w-full"
        >
            <div className="flex flex-col gap-1">
                <span>{athlete.name ?? 'Óþekkt'}</span>
                <div className="flex gap-4 text-gray-500 text-sm">
                    {athlete.age && <span>{`${athlete.age} ára`}</span>}
                    {athlete.gender && <span>{athlete.gender}</span>}
                </div>
            </div>
            {athlete.is_simple_athlete ? (
                <span className="text-gray-400">Án aðgang</span>
            ) : (
                <span className="text-secondary">Með aðgang</span>
            )}
        </button>
    );
}
