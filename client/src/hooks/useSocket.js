import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// Singleton — one socket for the whole app lifetime
let socketInstance = null;
let currentToken = null;

export const useSocket = (token) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    // Reuse if already connected with same token
    if (socketInstance && socketInstance.connected && currentToken === token) {
      socketRef.current = socketInstance;
      return;
    }

    // Disconnect stale socket if token changed
    if (socketInstance && currentToken !== token) {
      socketInstance.disconnect();
      socketInstance = null;
    }

    const socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:4000", {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      // Only log — don't treat "io client disconnect" as an error
      // That fires when we call socket.disconnect() intentionally (on leave)
      if (reason !== "io client disconnect") {
        console.warn("Socket disconnected unexpectedly:", reason);
      }
    });

    socketInstance = socket;
    currentToken = token;
    socketRef.current = socket;

    // No cleanup on unmount — socket lives for the app session
    // Only disconnect() when the user explicitly leaves (called from Room.jsx)
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

  // Called explicitly when user leaves the room
  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketInstance = null;
    currentToken = null;
  }, []);

  return { socket: socketRef, emit, on, off, disconnect };
};