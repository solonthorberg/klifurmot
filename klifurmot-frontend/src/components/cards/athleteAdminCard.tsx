import type { AthleteAdmin } from '@/types';
import MainButton from '../ui/mainButton';
import Icon from '../ui/icons';

interface AthleteCardProps {
    athlete: AthleteAdmin;
    onClick?: () => void;
    onLink?: () => void;
}

export default function AthleteAdminCard({
    athlete,
    onClick,
    onLink,
}: AthleteCardProps) {
    return (
        <div className="group flex items-center justify-between gap-2 border border-outline rounded-lg p-4 hover:shadow-md transition-shadow w-full">
            <button
                onClick={onClick}
                disabled={!onClick}
                className="flex flex-col gap-1 text-left flex-1 min-w-0 disabled:cursor-default"
            >
                <span>{athlete.name ?? 'Óþekkt'}</span>
                <div className="flex gap-4 text-gray-500 text-sm">
                    {athlete.age && <span>{`${athlete.age} ára`}</span>}
                    {athlete.gender && <span>{athlete.gender}</span>}
                </div>
            </button>
            <div className="flex items-center gap-2 shrink-0">
                {athlete.is_simple_athlete ? (
                    <>
                        {onLink && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MainButton
                                    size="small"
                                    variant="outline"
                                    square
                                    onClick={onLink}
                                    title="Tengja við aðgang"
                                >
                                    <Icon variant="link" size={14} />
                                </MainButton>
                            </div>
                        )}
                        <span className="text-gray-400 text-sm">
                            Án aðgangs
                        </span>
                    </>
                ) : (
                    <span className="text-secondary text-sm">Með aðgangi</span>
                )}
            </div>
        </div>
    );
}
