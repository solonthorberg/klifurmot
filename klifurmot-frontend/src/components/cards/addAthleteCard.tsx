import type { AthleteAdmin } from '@/types';
import type { ReactNode } from 'react';

interface AthleteCardProps {
    children?: ReactNode;
    athlete: AthleteAdmin;
    disabled?: boolean;
    className?: string;
    onClick?: () => Promise<void> | void;
}

export default function AddAthleteCard({
    children,
    athlete,
    disabled,
    className,
    onClick,
}: AthleteCardProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col text-left gap-1 border border-outline rounded-lg p-4 hover:shadow-md transition-shadow ${className}`}
        >
            <div className="flex gap-1 justify-between">
                <p>{athlete.name}</p>
                {children}
            </div>
            <div className="flex gap-1 text-gray-500">
                <span>{`${athlete.age} ára`}</span>
                <span>{`- ${athlete.category}`}</span>
                <span>{athlete.gender}</span>
            </div>
        </button>
    );
}
