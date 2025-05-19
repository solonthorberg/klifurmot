import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Competitions from '../pages/Competitions';
import Athletes from '../pages/Athletes';
import About from '../pages/About';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/competitions" element={<Competitions />} />
      <Route path="/athletes" element={<Athletes />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

export default AppRoutes;
