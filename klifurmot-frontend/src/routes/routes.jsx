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

function JudgeDashboardPageWrapper() {
  const { competitionId } = useParams();
  return <JudgeDashboardPage competitionId={competitionId} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/competitions" element={<Competitions />} />
      <Route path="/competitions/:id" element={<CompetitionDetails />} />
      <Route path="/athletes" element={<Athletes />} />
      <Route path="/athletes/:id" element={<AthletesDetails />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/judge/login/:token" element={<JudgeLoginPage />} />
      <Route
        path="/judge/competition/:competitionId/judge-dashboard"
        element={<JudgeDashboardPageWrapper />}
      />
      <Route
        path="/admin/competition/:competitionId/judge-dashboard"
        element={<JudgeDashboardPageWrapper />}
      />
      <Route path="/controlpanel" element={<ControlPanel />} />
      <Route
        path="/controlpanel/:competitionId"
        element={<ControlPanelDetails />}
      />
      <Route
        path="/controlpanel/edit/:competitionId"
        element={<CreateCompetition />}
      />
      <Route path="/controlpanel/create" element={<CreateCompetition />} />
    </Routes>
  );
}

export default AppRoutes;
