// src/hooks/useWebSocket.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import config, { debugLog } from "../config/Environment";

const useWebSocket = (path, options = {}) => {
  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnect = true,
    reconnectAttempts = config.WS_RECONNECT_ATTEMPTS,
    reconnectInterval = config.WS_RECONNECT_INTERVAL,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const shouldReconnectRef = useRef(reconnect);

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const connect = useCallback(() => {
    try {
      // Clean up existing connection
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }

      const wsUrl = config.getWebSocketUrl(path);
      debugLog(`🔌 Connecting to WebSocket: ${wsUrl}`);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = (event) => {
        debugLog("✅ WebSocket connected");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        clearReconnectTimeout();

        if (onOpen) {
          onOpen(event);
        }
      };

      socket.onmessage = (event) => {
        debugLog("📨 WebSocket message received:", event.data);

        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          if (onMessage) {
            onMessage(data, event);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
          setError({ type: "parse_error", message: err.message });
        }
      };

      socket.onerror = (event) => {
        debugLog("❌ WebSocket error:", event);
        const errorData = {
          type: "connection_error",
          message: "WebSocket connection error",
        };
        setError(errorData);

        if (onError) {
          onError(errorData, event);
        }
      };

      socket.onclose = (event) => {
        debugLog(
          `⚠️ WebSocket closed: Code ${event.code}, Reason: ${event.reason}`
        );
        setIsConnected(false);

        if (onClose) {
          onClose(event);
        }

        // Handle reconnection
        if (
          shouldReconnectRef.current &&
          reconnectAttemptsRef.current < reconnectAttempts &&
          !event.wasClean
        ) {
          const delay =
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current);
          debugLog(
            `🔄 Reconnecting in ${delay}ms (attempt ${
              reconnectAttemptsRef.current + 1
            }/${reconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        }
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setError({ type: "setup_error", message: err.message });
    }
  }, [
    path,
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnectAttempts,
    reconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    debugLog("🛑 Disconnecting WebSocket");
    shouldReconnectRef.current = false;
    clearReconnectTimeout();

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === "string" ? data : JSON.stringify(data);
      debugLog("📤 Sending WebSocket message:", message);
      socketRef.current.send(message);
    } else {
      console.error("Cannot send message: WebSocket is not connected");
      setError({ type: "send_error", message: "WebSocket is not connected" });
    }
  }, []);

  // Set up connection and cleanup
  useEffect(() => {
    shouldReconnectRef.current = reconnect;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect, reconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
};

export default useWebSocket;
