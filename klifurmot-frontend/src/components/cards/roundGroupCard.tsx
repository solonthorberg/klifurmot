import type { RoundGroup } from '@/types';

export default function RoundGroupCard({ round }: { round: RoundGroup }) {
    return (
        <div className="flex flex-col w-full rounded-lg overflow-hidden transition-shadow border border-outline">
            <div className="p-4 flex flex-row justify-between gap-1 items-center">
                <h2 className="font-semibold text-lg">{round.name}</h2>
                <p className="text-gray-500">
                    {round.is_default && 'Stöðluð umferð'}
                </p>
            </div>
        </div>
    );
}
