import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

let socketInstance = null;

export const useSocket = (token) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    // Reuse existing connection if token hasn't changed
    if (socketInstance && socketInstance.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:4000", {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("connect_error", (err) => console.error("Socket error:", err.message));
    socket.on("disconnect", (reason) => console.log("Socket disconnected:", reason));

    socketInstance = socket;
    socketRef.current = socket;

    return () => {
      // Don't disconnect on component unmount — let Room page manage lifecycle
    };
  }, [token]);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketInstance = null;
  }, []);

  return { socket: socketRef, emit, on, off, disconnect };
};
