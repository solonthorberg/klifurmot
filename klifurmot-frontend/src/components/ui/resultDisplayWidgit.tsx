import type { BoulderScore } from '@/types';

export default function ResultDisplayWidget({
    boulderScore,
}: {
    boulderScore: BoulderScore;
}) {
    const isTop = boulderScore.top_reached;
    const isZone = boulderScore.zone_reached;
    const isFailed = boulderScore.attempted && !isTop && !isZone;

    return (
        <div className="flex flex-col items-center gap-1">
            <div
                className={`relative w-6 h-12 border border-gray-800 rounded-sm overflow-hidden
                    ${isTop ? 'bg-gray-800' : ''}
                `}
            >
                {isZone && !isTop && (
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gray-800" />
                )}
                {isFailed && (
                    <div className="absolute top-0 left-0 w-[1px] h-[110%] bg-gray-800 origin-top-left rotate-[334.5deg]" />
                )}
                <div className="relative flex flex-col items-center h-full">
                    <span
                        className={`text-xs font-bold w-full h-full flex items-center justify-center ${isTop ? 'text-white' : 'text-gray-800'}`}
                    >
                        {isTop ? boulderScore.attempts_top : ''}
                    </span>
                    <span
                        className={`text-xs font-bold w-full h-full flex items-center justify-center ${isTop || isZone ? 'text-white' : 'text-gray-800'}`}
                    >
                        {isZone ? boulderScore.attempts_zone : ''}
                    </span>
                </div>
            </div>
            <span className="text-xs text-gray-500">
                {boulderScore.boulder_number}
            </span>
        </div>
    );
}
