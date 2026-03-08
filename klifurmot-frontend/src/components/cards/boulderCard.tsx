import type { BoulderStats } from '@/types';

export default function BoulderCard({ boulder }: { boulder: BoulderStats }) {
    return (
        <tr className="border-b border-outline last:border-0">
            <td className="px-4 py-3">{boulder.number}</td>
            <td className="px-4 py-3">{boulder.tops}</td>
            <td className="px-4 py-3">{boulder.zones}</td>
        </tr>
    );
}
