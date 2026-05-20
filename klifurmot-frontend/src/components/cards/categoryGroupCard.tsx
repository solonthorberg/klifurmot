import type { CategoryGroup } from '@/types';

export default function CategoryGroupCard({
    category,
}: {
    category: CategoryGroup;
}) {
    return (
        <div className="flex flex-col w-full rounded-lg overflow-hidden transition-shadow border border-outline">
            <div className="p-4 flex flex-row justify-between gap-1 items-center">
                <h2 className="font-semibold text-lg">{category.name}</h2>
                <p className="text-gray-500">{`${category.min_age}-${category.max_age} ára`}</p>
            </div>
        </div>
    );
}
