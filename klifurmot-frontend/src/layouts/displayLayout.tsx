import { Outlet } from 'react-router-dom';

export default function DisplayLayout() {
    return (
        <div className="flex flex-col h-full">
            <main className="flex-1 min-h-0 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}
