import type { CompetitionAthlete } from '@/types';
import { getFlagEmoji } from '@/utils/getFlagEmoji';
import DisplayAthleteName from '../ui/displayAthleteName';

export default function AthleteRegisterCard({
    athlete,
}: {
    athlete: CompetitionAthlete;
}) {
    return (
        <tr className="border-b border-outline last:border-0">
            <td className="px-4 py-3">
                <DisplayAthleteName Name={athlete.full_name} />
            </td>
            <td className="px-4 py-3">{athlete.category_name}</td>
            <td className="px-4 py-3 ">{athlete.gender}</td>
            <td className="px-4 py-3 text-right">
                {getFlagEmoji(athlete.nationality)}
            </td>
        </tr>
    );
}
