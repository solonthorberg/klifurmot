import { Routes, Route } from 'react-router-dom';

import MainLayout from '@/layouts/mainLayout';
import AboutPage from '@/pages/aboutPage';
import AthletesPage from '@/pages/athletesPage';
import AthleteDetailPage from '@/pages/athleteDetailPage';
import CompetitionDetailPage from '@/pages/competitionDetailPage';
import CompetitionsPage from '@/pages/competitionsPage';
import HomePage from '@/pages/homePage';
import NotFoundPage from '@/pages/notFoundPage';
import LoginPage from '@/pages/loginPage';
import RegisterPage from '@/pages/registerPage';

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
                <Route path="/athletes/:id" element={<AthleteDetailPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}
