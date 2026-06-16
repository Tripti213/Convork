const { verifySocketToken } = require("../middleware/auth");

const rooms = new Map();
const waitingRooms = new Map();
const roomHosts = new Map();

const initSignaling = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));
    const user = verifySocketToken(token);
    if (!user) return next(new Error("Invalid token"));
    socket.user = user;
    next();
  });

  io.on("connection", (socket) => {
    console.log(`Connected: ${socket.user.name} (${socket.id})`);

    socket.on("join-room", ({ roomId, avatarColor, isCreator }) => {
      socket.currentRoom = roomId;
      if (!roomHosts.has(roomId) || isCreator) roomHosts.set(roomId, socket.user.id);
      const isRoomHost = roomHosts.get(roomId) === socket.user.id;
      const userData = {
        userId: socket.user.id, name: socket.user.name,
        avatarColor: avatarColor || "#6c63ff", socketId: socket.id, isHost: isRoomHost,
      };
      const roomIsLocked = rooms.get(roomId)?.locked === true;
      if (isRoomHost || !roomIsLocked) {
        admitToRoom(socket, roomId, userData);
      } else {
        if (!waitingRooms.has(roomId)) waitingRooms.set(roomId, new Map());
        waitingRooms.get(roomId).set(socket.id, userData);
        socket.emit("waiting-for-admission");
        broadcastWaitingList(roomId);
      }
    });

    socket.on("admit-user", ({ roomId, targetSocketId }) => {
      if (!getIsHost(socket.id, roomId)) return;
      const waiting = waitingRooms.get(roomId);
      const userData = waiting?.get(targetSocketId);
      if (!userData) return;
      waiting.delete(targetSocketId);
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) admitToRoom(targetSocket, roomId, userData);
      broadcastWaitingList(roomId);
    });

    socket.on("deny-user", ({ roomId, targetSocketId }) => {
      if (!getIsHost(socket.id, roomId)) return;
      waitingRooms.get(roomId)?.delete(targetSocketId);
      io.sockets.sockets.get(targetSocketId)?.emit("admission-denied");
      broadcastWaitingList(roomId);
    });

    socket.on("toggle-room-lock", ({ roomId, locked }) => {
      if (!getIsHost(socket.id, roomId)) return;
      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      rooms.get(roomId).locked = locked;
      io.in(roomId).emit("room-lock-changed", { locked });
    });

    socket.on("remove-participant", ({ roomId, targetSocketId }) => {
      if (!getIsHost(socket.id, roomId)) return;
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) { targetSocket.emit("removed-from-room"); targetSocket.leave(roomId); }
      rooms.get(roomId)?.delete(targetSocketId);
      socket.to(roomId).emit("user-left", { socketId: targetSocketId });
    });

    socket.on("offer", ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit("offer", { fromSocketId: socket.id, fromName: socket.user.name, offer });
    });
    socket.on("answer", ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit("answer", { fromSocketId: socket.id, answer });
    });
    socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit("ice-candidate", { fromSocketId: socket.id, candidate });
    });

    socket.on("chat-message", ({ roomId, message }) => {
      io.in(roomId).emit("chat-message", {
        id: `${Date.now()}-${Math.random()}`,
        from: socket.user.name, userId: socket.user.id,
        message, timestamp: new Date().toISOString(),
      });
    });

    // ── Whiteboard: log every event to confirm server receives it ──────────
    socket.on("whiteboard-event", ({ roomId, event }) => {
      console.log(`[WB] from ${socket.user.name} in room ${roomId}: ${event?.type}`);
      socket.to(roomId).emit("whiteboard-event", { fromSocketId: socket.id, event });
    });

    socket.on("screen-share-started", ({ roomId }) => {
      socket.to(roomId).emit("user-screen-share-started", { socketId: socket.id, name: socket.user.name });
    });
    socket.on("screen-share-stopped", ({ roomId }) => {
      socket.to(roomId).emit("user-screen-share-stopped", { socketId: socket.id });
    });
    socket.on("media-state", ({ roomId, audio, video }) => {
      socket.to(roomId).emit("user-media-state", { socketId: socket.id, audio, video });
    });
    socket.on("reaction", ({ roomId, emoji }) => {
      io.in(roomId).emit("reaction", { fromSocketId: socket.id, name: socket.user.name, emoji });
    });

    socket.on("disconnect", () => {
      const roomId = socket.currentRoom;
      if (!roomId) return;
      rooms.get(roomId)?.delete(socket.id);
      if (rooms.has(roomId) && rooms.get(roomId).size === 0) {
        rooms.delete(roomId); waitingRooms.delete(roomId); roomHosts.delete(roomId);
      } else {
        socket.to(roomId).emit("user-left", { socketId: socket.id });
      }
      if (waitingRooms.has(roomId)) { waitingRooms.get(roomId).delete(socket.id); broadcastWaitingList(roomId); }
    });

    socket.on("whiteboard-opened", ({ roomId, name }) => {
      socket.to(roomId).emit("whiteboard-opened", { name });
    });
    socket.on("whiteboard-closed", ({ roomId }) => {
      socket.to(roomId).emit("whiteboard-closed");
    });

    function admitToRoom(targetSocket, roomId, userData) {
      targetSocket.join(roomId);
      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      rooms.get(roomId).set(targetSocket.id, userData);
      const existingUsers = [];
      rooms.get(roomId).forEach((d, sid) => { if (sid !== targetSocket.id) existingUsers.push(d); });
      targetSocket.emit("room-users", existingUsers);
      targetSocket.emit("admitted", { isHost: userData.isHost });
      targetSocket.to(roomId).emit("user-joined", userData);
      broadcastWaitingList(roomId);
    }

    function getIsHost(socketId, roomId) {
      return rooms.get(roomId)?.get(socketId)?.isHost === true;
    }

    function broadcastWaitingList(roomId) {
      const waiting = waitingRooms.get(roomId);
      const waitingList = waiting ? [...waiting.values()] : [];
      rooms.get(roomId)?.forEach((userData, sid) => {
        if (userData.isHost) io.to(sid).emit("waiting-room-update", { waiting: waitingList });
      });
    }
  });
};

module.exports = { initSignaling };
