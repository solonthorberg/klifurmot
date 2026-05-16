import type { AthleteAdmin } from '@/types';

interface AthleteCardProps {
    athlete: AthleteAdmin;
    onClick?: () => void;
}

export default function AthleteCard({ athlete, onClick }: AthleteCardProps) {
    const name = athlete.is_simple_athlete
        ? athlete.simple_name
        : athlete.user_account?.full_name;

    const age = athlete.is_simple_athlete
        ? athlete.simple_age
        : athlete.user_account?.age;

    const gender = athlete.is_simple_athlete
        ? athlete.simple_gender
        : athlete.user_account?.gender;

    return (
        <button
            onClick={onClick}
            className="flex items-center justify-between cursor-pointer text-left gap-1 border border-outline rounded-lg p-4 hover:shadow-md transition-shadow w-full"
        >
            <div className="flex flex-col gap-1">
                <p>{name ?? 'Óþekkt'}</p>
                <div className="flex gap-4 text-gray-500 text-sm">
                    {age && <span>{`${age} ára`}</span>}
                    {gender && <span>{gender}</span>}
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
