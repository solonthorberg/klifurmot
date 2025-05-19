import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 

function Navbar() {
  const { isLoggedIn, logout } = useAuth();

  return (
    <nav className="navbars">
      <Link to="/" className="navbars-title">
        Klifurmót
      </Link>
      <ul className="navbar-links">
        <li>
          <Link to="/competitions">Mót</Link>
        </li>
        <li>
          <Link to="/athletes">Keppendur</Link>
        </li>
        <li>
          <Link to="/about">Um Okkur</Link>
        </li>
      </ul>
      {isLoggedIn ? (
        <Link to="/" onClick={logout}>
          Útskrá
        </Link>
      ) : (
        <Link to="/login">
          Innskrá
        </Link>
      )}
    </nav>
  );
}

export default Navbar;
