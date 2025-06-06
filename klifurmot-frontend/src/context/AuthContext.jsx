import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserInfo = async () => {
    try {
      const res = await api.get("/accounts/me/");
      setIsAdmin(res.data.profile.is_admin);
    } catch (err) {
      console.error("Failed to fetch user info:", err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserInfo();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  }, [isLoggedIn]);

  const login = (token) => {
    localStorage.setItem("token", token);
    setIsLoggedIn(true);
    fetchUserInfo();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isAdmin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
