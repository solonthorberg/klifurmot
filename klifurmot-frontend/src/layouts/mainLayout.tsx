import { Outlet } from 'react-router-dom';

import Navbar from '@/components/layouts/navbar';

export default function MainLayout() {
    return (
        <div className="flex flex-col h-dvh">
            <Navbar />
            <main className="flex-1 overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
}
