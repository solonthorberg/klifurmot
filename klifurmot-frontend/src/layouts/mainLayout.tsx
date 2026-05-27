import { Outlet } from 'react-router-dom';

import Navbar from '@/components/layouts/navbar';

export default function MainLayout() {
    return (
        <div className="flex flex-col h-full">
            <Navbar />
            <main className="flex-1 min-h-0">
                <Outlet />
            </main>
        </div>
    );
}
