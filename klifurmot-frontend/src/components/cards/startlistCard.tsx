import type { StartlistAthlete } from '@/types';

export default function StartlistCard({
    athlete,
}: {
    athlete: StartlistAthlete;
}) {
    return (
        <tr className="border-b border-outline last:border-0">
            <td className="pl-4 py-3 max-w-10 min-w-10">
                {athlete.start_order}
            </td>
            <td className="pl-4 py-3">{athlete.full_name}</td>
            <td className="px-4 text-right w-10">{athlete.category_name}</td>
        </tr>
    );
}
