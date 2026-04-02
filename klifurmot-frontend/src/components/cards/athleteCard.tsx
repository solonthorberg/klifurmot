import type { Athlete } from '@/types';
import { getFlagEmoji } from '@/utils/getFlagEmoji';

export default function AthleteCard({ athlete }: { athlete: Athlete }) {
    return (
        <div className="flex">
            <p>{athlete.name}</p>
            <div>
                <p>{getFlagEmoji(athlete.nationality)}</p>
                <p>{athlete.age}</p>
            </div>
        </div>
    );
}
