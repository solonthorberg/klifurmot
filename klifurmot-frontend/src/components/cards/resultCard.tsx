import ResultDisplayWidget from '../ui/resultDisplayWidgit';

import type { ResultEntry } from '@/types';

export default function ResultCard({ athlete }: { athlete: ResultEntry }) {
    return (
        <tr className="border-b border-outline last:border-0 h-25">
            <td className="pl-4 max-w-5 min-w-5">{athlete.rank}</td>
            <td className="pl-4 max-w-35">{athlete.full_name}</td>
            <td className="pl-4 pt-2">
                <div className="flex gap-1">
                    {athlete.boulders.map((b) => (
                        <ResultDisplayWidget
                            key={b.boulder_number}
                            boulderScore={b}
                        />
                    ))}
                </div>
            </td>
            <td className="px-4 text-right w-10">{athlete.total_score}</td>
        </tr>
    );
}
