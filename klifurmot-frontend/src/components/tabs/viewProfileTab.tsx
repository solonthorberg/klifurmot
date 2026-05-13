import type { UserAccount } from '@/types';

export default function ViewProfileTab({ user }: { user: UserAccount }) {
    return (
        <div className="w-xl flex flex-col gap-2">
            <label>Fullt nafn</label>
            <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                <p className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none">
                    {user.full_name}
                </p>
            </div>
            <label>Netfang</label>
            <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                <p className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none">
                    {user.user.email}
                </p>
            </div>
            <label>Fæðingardagur</label>
            <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                <p className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none">
                    {user.date_of_birth}
                </p>
            </div>
            <label>Kyn</label>
            <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                <p className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none">
                    {user.gender}
                </p>
            </div>
            <label>Þjóðerni</label>
            <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                <p className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none">
                    {user.nationality}
                </p>
            </div>
            <label>Hæð (cm)</label>
            <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                <p className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none">
                    {user.height_cm ? user.height_cm : 'Ekki skráð'}
                </p>
            </div>
            <label>Vænghaf (cm)</label>
            <div className="flex items-center rounded-md bg-white pl-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-secondary">
                <p className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none">
                    {user.wingspan_cm ? user.wingspan_cm : 'Ekki skráð'}
                </p>
            </div>
        </div>
    );
}
