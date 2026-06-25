import { Outlet } from 'react-router-dom';

import Navbar from '@/components/layouts/navbar';
import Footer from '@/components/layouts/footer';

export default function MainLayout() {
    return (
        <div className="flex flex-col h-full">
            <Navbar />
            <main className="flex-1 min-h-0 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}
