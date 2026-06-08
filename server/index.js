require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");
const { initSignaling } = require("./socket/signaling");
const { authenticateToken } = require("./middleware/auth");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use("/uploads", express.static("uploads")); // serve uploaded files

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", authenticateToken, fileRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Socket.io signaling
initSignaling(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
