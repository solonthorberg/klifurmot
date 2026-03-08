import type { CompetitionAthlete } from '@/types';
import { getFlagEmoji } from '@/utils/getFlagEmoji';

export default function AthleteCard({
    athlete,
}: {
    athlete: CompetitionAthlete;
}) {
    return (
        <tr className="border-b border-outline last:border-0">
            <td className="px-4 py-3">{athlete.full_name}</td>
            <td className="px-4 py-3">{athlete.category_name}</td>
            <td className="px-4 py-3 ">{athlete.gender}</td>
            <td className="px-4 py-3 text-right">
                {getFlagEmoji(athlete.nationality)}
            </td>
        </tr>
    );
}
