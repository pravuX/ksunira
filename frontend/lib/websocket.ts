import { useEffect, useRef, useState, useCallback } from 'react';

type MessageHandler = (message: any) => void;

export function useWebSocket(url: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());

  useEffect(() => {
    if (!url) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handlersRef.current.forEach(handler => handler(message));
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    ws.onclose = (event) => {
      console.log(`WebSocket disconnected: Code ${event.code}, Reason: ${event.reason}`);
      setIsConnected(false);
    };

    ws.onerror = (e) => {
      console.error('WebSocket error:', e);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  const addMessageHandler = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return { isConnected, sendMessage, addMessageHandler };
}
