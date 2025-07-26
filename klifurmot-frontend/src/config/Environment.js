const getWebSocketUrl = (path) => {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;

  return `${wsProtocol}//${wsHost}/ws/${path}`;
};

const getApiUrl = (path) => {
  const apiBase = import.meta.env.VITE_API_URL || "";

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${apiBase}${normalizedPath}`;
};

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

const config = {
  API_BASE_URL: import.meta.env.VITE_API_URL || "",
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,

  WS_RECONNECT_ATTEMPTS:
    parseInt(import.meta.env.VITE_WS_RECONNECT_ATTEMPTS) || 5,
  WS_RECONNECT_INTERVAL:
    parseInt(import.meta.env.VITE_WS_RECONNECT_INTERVAL) || 1000,

  ENABLE_DEBUG_LOGGING: import.meta.env.VITE_ENABLE_DEBUG_LOGGING === "true",

  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",

  isDevelopment,
  isProduction,

  getWebSocketUrl,
  getApiUrl,
};

export const debugLog = (...args) => {
  if (config.ENABLE_DEBUG_LOGGING || config.isDevelopment) {
    console.log("[Klifurmot Debug]", ...args);
  }
};

export default config;
