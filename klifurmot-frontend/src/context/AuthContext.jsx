import { createContext, useContext, useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  const fetchUserInfo = async () => {
    try {
      const res = await api.get("/accounts/me/");
      setIsAdmin(res.data.profile.is_admin);
      setUsername(res.data.user.username);
    } catch (err) {
      console.error("Failed to fetch user info:", err);
      setIsAdmin(false);
      setUsername("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      setAuthToken(token);
      setIsLoggedIn(true);
      fetchUserInfo();
    } else {
      setIsLoggedIn(false);
      setIsAdmin(false);
      setLoading(false);
    }
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    setAuthToken(token);
    setIsLoggedIn(true);
    fetchUserInfo();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setAuthToken(null);
    setIsLoggedIn(false);
    setIsAdmin(false);
    setUsername("");
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, isAdmin, username, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
