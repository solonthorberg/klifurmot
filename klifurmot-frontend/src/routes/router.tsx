import { Routes, Route } from 'react-router-dom';

import MainLayout from '@/layouts/mainLayout';
import AboutPage from '@/pages/aboutPage';
import AthletesPage from '@/pages/athletesPage';
import CompetitionDetailPage from '@/pages/competitionDetailPage';
import CompetitionsPage from '@/pages/competitionsPage';
import HomePage from '@/pages/homePage';
import NotFoundPage from '@/pages/notFoundPage';

export default function Router() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/competitions" element={<CompetitionsPage />} />
                <Route
                    path="/competitions/:competitionId"
                    element={<CompetitionDetailPage />}
                />
                <Route path="/athletes" element={<AthletesPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}
