import { Routes, Route, useParams } from "react-router-dom";
import Home from "../pages/Home";
import Competitions from "../pages/Competitions";
import CompetitionDetails from "../pages/CompetitionDetails";
import Athletes from "../pages/Athletes";
import AthletesDetails from "../pages/AthletesDetails";
import About from "../pages/About";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Profile from "../pages/Profile";
import JudgeLoginPage from "../pages/JudgeLoginPage";
import JudgeDashboardPage from "../pages/JudgeDashboardPage";
import ControlPanel from "../pages/ControlPanel";
import ControlPanelDetails from "../pages/ControlPanelDetails";
import CreateCompetition from "../pages/CreateCompetition";
import NotFound from "../pages/NotFound";
import Unauthorized from "../pages/Unauthorized";
import ProtectedRoute from "./ProtectedRoutes";

function JudgeDashboardPageWrapper() {
  const { competitionId } = useParams();
  return <JudgeDashboardPage competitionId={competitionId} />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/competitions" element={<Competitions />} />
      <Route path="/competitions/:id" element={<CompetitionDetails />} />
      <Route path="/athletes" element={<Athletes />} />
      <Route path="/athletes/:id" element={<AthletesDetails />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* Protected routes - require authentication */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />
      
      {/* Judge routes - require authentication */}
      <Route path="/judge/login/:token" element={<JudgeLoginPage />} />
      <Route
        path="/judge/competition/:competitionId/judge-dashboard"
        element={
          <ProtectedRoute>
            <JudgeDashboardPageWrapper />
          </ProtectedRoute>
        }
      />
      
      {/* Admin-only routes - require admin privileges */}
      <Route
        path="/admin/competition/:competitionId/judge-dashboard"
        element={
          <ProtectedRoute requireAdmin={true}>
            <JudgeDashboardPageWrapper />
          </ProtectedRoute>
        }
      />
      
      {/* Control panel routes - handle their own authorization */}
      <Route path="/controlpanel" element={<ControlPanel />} />
      <Route path="/controlpanel/:competitionId" element={<ControlPanelDetails />} />
      <Route path="/controlpanel/edit/:competitionId" element={<CreateCompetition />} />
      <Route path="/controlpanel/create" element={<CreateCompetition />} />
      
      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;