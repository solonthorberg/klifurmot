import axios from "axios";
import config from "../config/Environment";

// Create axios instance
const api = axios.create({
  baseURL: config.API_BASE_URL || "/api",
  timeout: config.API_TIMEOUT || 30000,
  withCredentials: true, // 🧠 Important for CSRF/session cookies
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  xsrfCookieName: "csrftoken", // 👈 Django's CSRF cookie name
  xsrfHeaderName: "X-CSRFToken", // 👈 Header Django expects
});

// Request interceptor for token auth
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Helper function to set token manually
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common["Authorization"] = `Token ${token}`;
  } else {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
  }
};

export default api;
