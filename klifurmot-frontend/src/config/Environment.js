// src/config/environment.js

const getWebSocketUrl = (path) => {
  // Determine protocol based on current page protocol
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  // Get WebSocket host from environment variable or use current host
  const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;

  // Build complete WebSocket URL
  return `${wsProtocol}//${wsHost}/ws/${path}`;
};

const getApiUrl = (path) => {
  // Get API base URL from environment variable or use default
  const apiBase = import.meta.env.VITE_API_URL || "";

  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${apiBase}${normalizedPath}`;
};

// Environment detection
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Consolidated environment configuration
const config = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_URL || "",
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,

  // WebSocket Configuration
  WS_RECONNECT_ATTEMPTS:
    parseInt(import.meta.env.VITE_WS_RECONNECT_ATTEMPTS) || 5,
  WS_RECONNECT_INTERVAL:
    parseInt(import.meta.env.VITE_WS_RECONNECT_INTERVAL) || 1000,

  // Feature Flags
  ENABLE_DEBUG_LOGGING: import.meta.env.VITE_ENABLE_DEBUG_LOGGING === "true",

  // Google OAuth
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",

  // Environment
  isDevelopment,
  isProduction,

  // Helper functions
  getWebSocketUrl,
  getApiUrl,
};

// Debug logging helper
export const debugLog = (...args) => {
  if (config.ENABLE_DEBUG_LOGGING || config.isDevelopment) {
    console.log("[Klifurmot Debug]", ...args);
  }
};

export default config;
