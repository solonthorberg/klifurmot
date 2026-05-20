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
import ProfilePage from '@/pages/profilePage';
import { ProtectedRoutes } from './protectedRoutes';
import CreateCompetitionPage from '@/pages/createCompetitionPage';
import AdminPanelDetailsPage from '@/pages/adminPanelDetailsPage';
import AdminPanelPage from '@/pages/adminPanelPage';
import EditCompetitionPage from '@/pages/editCompetitionPage';
import JudgeDashboardPage from '@/pages/judgeDashboardPage';

export default function Router() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="*" element={<NotFoundPage />} />
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
                <Route element={<ProtectedRoutes />}>
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route
                        path="/competitions/:competitionId/judge-dashboard"
                        element={<JudgeDashboardPage />}
                    />
                </Route>
                <Route element={<ProtectedRoutes requiredRole="admin" />}>
                    <Route path="/admin-panel" element={<AdminPanelPage />} />
                    <Route
                        path="/admin-panel/:competitionId"
                        element={<AdminPanelDetailsPage />}
                    />
                    <Route
                        path="/admin-panel/create-competition"
                        element={<CreateCompetitionPage />}
                    />
                    <Route
                        path="/admin-panel/:competitionId/edit-competition"
                        element={<EditCompetitionPage />}
                    />
                </Route>
            </Route>
        </Routes>
    );
}
