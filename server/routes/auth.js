const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const { generateTurnCredentials } = require("../utils/turnCredentials");

const router = express.Router();

// ─── Register ─────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    // Check existing user
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Random avatar color from a palette
    const colors = ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899", "#14b8a6"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, avatar_color) VALUES ($1, $2, $3, $4) RETURNING id, name, email, avatar_color",
      [name, email, passwordHash, avatarColor]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, avatarColor: user.avatar_color } });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, password_hash, avatar_color FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarColor: user.avatar_color } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get current user ─────────────────────────────────────────────────────────
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, avatar_color, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user = result.rows[0];
    res.json({ id: user.id, name: user.name, email: user.email, avatarColor: user.avatar_color });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Create Room ──────────────────────────────────────────────────────────────
router.post("/rooms", authenticateToken, async (req, res) => {
  const { name, password } = req.body;
  if (!name) return res.status(400).json({ error: "Room name is required" });

  try {
    // Generate unique 8-char code like NXM-4829
    const code = "NXM-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const result = await pool.query(
      "INSERT INTO rooms (code, name, host_id, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, code, name",
      [code, name, req.user.id, passwordHash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create room error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Join Room (validate code + optional password) ────────────────────────────
router.post("/rooms/join", authenticateToken, async (req, res) => {
  const { code, password } = req.body;
  if (!code) return res.status(400).json({ error: "Room code is required" });

  try {
    const result = await pool.query(
      "SELECT id, code, name, host_id, password_hash, is_active FROM rooms WHERE code = $1",
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Room not found" });
    const room = result.rows[0];

    if (!room.is_active) return res.status(410).json({ error: "Room has ended" });

    if (room.password_hash) {
      if (!password) return res.status(401).json({ error: "Room requires a password" });
      const valid = await bcrypt.compare(password, room.password_hash);
      if (!valid) return res.status(401).json({ error: "Wrong room password" });
    }

    res.json({ id: room.id, code: room.code, name: room.name, isHost: room.host_id === req.user.id });
  } catch (err) {
    console.error("Join room error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/ice-servers", authenticateToken, (req, res) => {
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  // Preferred: dynamic time-limited credentials (requires TURN_SECRET in .env)
  const dynamic = generateTurnCredentials(req.user.id);
  if (dynamic && process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: dynamic.username,
      credential: dynamic.credential,
    });
  }
  // Fallback: static credentials from .env
  else if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }
  // If neither is configured, client falls back to STUN-only (logged client-side)

  res.json({ iceServers });
});

module.exports = router;
