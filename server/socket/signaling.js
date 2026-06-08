const { verifySocketToken } = require("../middleware/auth");

// rooms: Map<roomId, Map<socketId, { userId, name, avatarColor }>>
const rooms = new Map();

const initSignaling = (io) => {
  // ─── Auth middleware for socket connections ──────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));

    const user = verifySocketToken(token);
    if (!user) return next(new Error("Invalid token"));

    socket.user = user; // attach user to socket
    next();
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.id})`);

    // ─── Join Room ──────────────────────────────────────────────────────────
    socket.on("join-room", ({ roomId, avatarColor }) => {
      socket.join(roomId);
      socket.currentRoom = roomId;

      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      rooms.get(roomId).set(socket.id, {
        userId: socket.user.id,
        name: socket.user.name,
        avatarColor: avatarColor || "#3b82f6",
        socketId: socket.id,
      });

      // Tell the new user about everyone already in the room
      const existingUsers = [];
      rooms.get(roomId).forEach((userData, sid) => {
        if (sid !== socket.id) existingUsers.push(userData);
      });
      socket.emit("room-users", existingUsers);

      // Tell everyone else a new user joined
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        userId: socket.user.id,
        name: socket.user.name,
        avatarColor: avatarColor || "#3b82f6",
      });

      console.log(`${socket.user.name} joined room ${roomId}. Total: ${rooms.get(roomId).size}`);
    });

    // ─── WebRTC Signaling: Offer ─────────────────────────────────────────────
    // Caller sends offer to a specific peer
    socket.on("offer", ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit("offer", {
        fromSocketId: socket.id,
        fromName: socket.user.name,
        offer,
      });
    });

    // ─── WebRTC Signaling: Answer ────────────────────────────────────────────
    socket.on("answer", ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit("answer", {
        fromSocketId: socket.id,
        answer,
      });
    });

    // ─── WebRTC Signaling: ICE Candidate ────────────────────────────────────
    socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit("ice-candidate", {
        fromSocketId: socket.id,
        candidate,
      });
    });

    // ─── Chat message (broadcast to room) ───────────────────────────────────
    socket.on("chat-message", ({ roomId, message }) => {
      const payload = {
        id: Date.now(),
        from: socket.user.name,
        userId: socket.user.id,
        message,
        timestamp: new Date().toISOString(),
      };
      // Send to everyone in room including sender
      io.in(roomId).emit("chat-message", payload);
    });

    // ─── Whiteboard event (broadcast to others) ──────────────────────────────
    socket.on("whiteboard-event", ({ roomId, event }) => {
      socket.to(roomId).emit("whiteboard-event", { fromSocketId: socket.id, event });
    });

    // ─── Screen share status ─────────────────────────────────────────────────
    socket.on("screen-share-started", ({ roomId }) => {
      socket.to(roomId).emit("user-screen-share-started", {
        socketId: socket.id,
        name: socket.user.name,
      });
    });

    socket.on("screen-share-stopped", ({ roomId }) => {
      socket.to(roomId).emit("user-screen-share-stopped", { socketId: socket.id });
    });

    // ─── User media state (mute/cam toggle) ──────────────────────────────────
    socket.on("media-state", ({ roomId, audio, video }) => {
      socket.to(roomId).emit("user-media-state", {
        socketId: socket.id,
        audio,
        video,
      });
    });

    // ─── Reaction ────────────────────────────────────────────────────────────
    socket.on("reaction", ({ roomId, emoji }) => {
      io.in(roomId).emit("reaction", { fromSocketId: socket.id, name: socket.user.name, emoji });
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const roomId = socket.currentRoom;
      if (roomId && rooms.has(roomId)) {
        rooms.get(roomId).delete(socket.id);

        // Clean up empty rooms
        if (rooms.get(roomId).size === 0) rooms.delete(roomId);

        // Notify others
        socket.to(roomId).emit("user-left", { socketId: socket.id });
      }
      console.log(`User disconnected: ${socket.user?.name} (${socket.id})`);
    });
  });
};

module.exports = { initSignaling };
