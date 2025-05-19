import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Competitions from '../pages/Competitions';
import CompetitionDetails from "../pages/CompetitionDetails";
import Athletes from '../pages/Athletes';
import AthletesDetails from '../pages/AthletesDetails';
import About from '../pages/About';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';

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
      <Route path="/Register" element={<Register />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

export default AppRoutes;
