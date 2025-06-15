// services/api.jsx - Enhanced with better debugging
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Set the Authorization token
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Token ${token}`;
    console.log(
      "✅ Authorization header set:",
      `Token ${token.substring(0, 10)}...`
    );
  } else {
    delete api.defaults.headers.common["Authorization"];
    console.log("❌ Authorization header removed");
  }
};

// Request interceptor to log outgoing requests
api.interceptors.request.use(
  (config) => {
    console.log("📤 API Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasAuth: !!config.headers.Authorization,
      contentType: config.headers["Content-Type"],
    });

    // Log form data contents for debugging
    if (config.data instanceof FormData) {
      console.log("📋 FormData contents:");
      for (let [key, value] of config.data.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
    }

    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", {
      status: response.status,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
    });
    return response;
  },
  (error) => {
    console.error("❌ API Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      data: error.response?.data,
    });

    // Handle specific error cases
    if (error.response?.status === 403) {
      console.error("🚫 403 Forbidden - Check authentication and permissions");
      console.error(
        "Auth header:",
        error.config?.headers?.Authorization ? "Present" : "Missing"
      );
      console.error("Error details:", error.response?.data);
    }

    if (error.response?.status === 401) {
      console.error("🔒 401 Unauthorized - Token may be invalid or expired");
      // Optional: Redirect to login or refresh token
    }

    return Promise.reject(error);
  }
);

export default api;
