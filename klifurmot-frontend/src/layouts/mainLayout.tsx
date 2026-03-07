import { Outlet } from 'react-router-dom';

import Navbar from '@/components/layouts/navbar';

export default function MainLayout() {
    return (
        <div>
            <Navbar />
            <main>
                <Outlet />
            </main>
        </div>
    );
}
