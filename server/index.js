require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");
const { initSignaling } = require("./socket/signaling");
const { authenticateToken } = require("./middleware/auth");
const { startCleanupScheduler } = require("./jobs/cleanup");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ─── Security headers ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // frontend served separately by Vite
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));

// ─── Rate limiting ──────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Upload limit reached. Please try again later." },
});

app.use("/api", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/files/upload", uploadLimiter);

// Static files (note: these are now ENCRYPTED on disk — direct access won't work,
// must go through /api/files/download/:id which decrypts on the fly)
app.use("/uploads", express.static("uploads"));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/files", authenticateToken, fileRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ─── Socket.io signaling ──────────────────────────────────────────────────────
initSignaling(io);

// ─── Background jobs ───────────────────────────────────────────────────────────
startCleanupScheduler();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Security: Helmet [ok]  Rate limiting [ok]  File encryption [ok]  Auto-cleanup [ok]`);
});
