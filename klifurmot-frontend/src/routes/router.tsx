import { Routes, Route } from 'react-router-dom';

import MainLayout from '@/layouts/mainLayout';
import AboutPage from '@/pages/aboutPage';
import AthletesPage from '@/pages/athletesPage';
import CompetitionPage from '@/pages/competitionPage';
import HomePage from '@/pages/homePage';

export default function Router() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/competitions" element={<CompetitionPage />} />
                <Route path="/athletes" element={<AthletesPage />} />
                <Route path="/about" element={<AboutPage />} />
            </Route>
        </Routes>
    );
}
