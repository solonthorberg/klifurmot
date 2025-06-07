import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 

function Navbar() {
  const { isLoggedIn, logout, isAdmin, username } = useAuth();

  return (
    <nav className="navbars">
      <Link to="/" className="navbars-title">
        Klifurmót
      </Link>
      {isAdmin ? (
        <ul className="navbar-links">
          <li><Link to="/competitions">Mót</Link></li>
          <li><Link to="/athletes">Keppendur</Link></li>
          <li><Link to="/about">Um Okkur</Link></li>
          <li><Link to="/controlpanel">Stjórnborð</Link></li>
        </ul>
      ) : (
        <ul className="navbar-links">
          <li><Link to="/competitions">Mót</Link></li>
          <li><Link to="/athletes">Keppendur</Link></li>
          <li><Link to="/about">Um Okkur</Link></li>
        </ul>
      )}
      {isLoggedIn ? (
        <ul>
          <li><Link to="/" onClick={logout}>Útskrá</Link></li>
          <li><Link to="/profile">{username}</Link></li> 
        </ul>
      ) : (
        <Link to="/login">Innskrá</Link>
      )}
    </nav>
  );
}

export default Navbar;
