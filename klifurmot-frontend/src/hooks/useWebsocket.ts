import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
    onMessage?: (data: unknown) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
    reconnect?: boolean;
    reconnectInterval?: number;
    reconnectAttempts?: number;
}

interface UseWebSocketReturn {
    isConnected: boolean;
    lastMessage: unknown;
    send: (data: unknown) => void;
    disconnect: () => void;
}

export function useWebSocket(
    url: string | null,
    options: UseWebSocketOptions = {},
): UseWebSocketReturn {
    const {
        reconnect = true,
        reconnectInterval = 3000,
        reconnectAttempts = 5,
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<unknown>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectCountRef = useRef(0);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const onMessageRef = useRef(options.onMessage);
    const onOpenRef = useRef(options.onOpen);
    const onCloseRef = useRef(options.onClose);
    const onErrorRef = useRef(options.onError);

    useEffect(() => {
        onMessageRef.current = options.onMessage;
        onOpenRef.current = options.onOpen;
        onCloseRef.current = options.onClose;
        onErrorRef.current = options.onError;
    });

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const send = useCallback((data: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    useEffect(() => {
        if (!url) return;

        const connect = () => {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                setIsConnected(true);
                reconnectCountRef.current = 0;
                onOpenRef.current?.();
            };

            ws.onclose = () => {
                setIsConnected(false);
                onCloseRef.current?.();

                if (
                    reconnect &&
                    reconnectCountRef.current < reconnectAttempts
                ) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectCountRef.current += 1;
                        connect();
                    }, reconnectInterval);
                }
            };

            ws.onerror = (error) => {
                onErrorRef.current?.(error);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                    onMessageRef.current?.(data);
                } catch {
                    setLastMessage(event.data);
                    onMessageRef.current?.(event.data);
                }
            };

            wsRef.current = ws;
        };

        connect();

        return () => {
            disconnect();
        };
    }, [url, reconnect, reconnectInterval, reconnectAttempts, disconnect]);

    return { isConnected, lastMessage, send, disconnect };
}
