const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../config/db");

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer config — store with UUID filename to prevent collisions
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (req, file, cb) => {
    // Block executable files
    const blocked = [".exe", ".bat", ".sh", ".cmd", ".msi"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (blocked.includes(ext)) {
      return cb(new Error("File type not allowed"));
    }
    cb(null, true);
  },
});

// ─── Upload file to a room ─────────────────────────────────────────────────
router.post("/upload/:roomId", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const result = await pool.query(
      `INSERT INTO room_files (room_id, uploaded_by, filename, original_name, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, original_name, mime_type, size_bytes, created_at`,
      [req.params.roomId, req.user.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
    );

    const file = result.rows[0];
    res.json({
      id: file.id,
      name: file.original_name,
      mimeType: file.mime_type,
      size: file.size_bytes,
      uploadedAt: file.created_at,
      downloadUrl: `/api/files/download/${file.id}`,
    });
  } catch (err) {
    console.error("Upload error:", err);
    // Clean up orphaned file
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: "Upload failed" });
  }
});

// ─── List files in a room ──────────────────────────────────────────────────
router.get("/room/:roomId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rf.id, rf.original_name, rf.mime_type, rf.size_bytes, rf.created_at,
              u.name as uploader_name
       FROM room_files rf
       JOIN users u ON rf.uploaded_by = u.id
       WHERE rf.room_id = $1
       ORDER BY rf.created_at DESC`,
      [req.params.roomId]
    );
    res.json(result.rows.map(f => ({
      id: f.id,
      name: f.original_name,
      mimeType: f.mime_type,
      size: f.size_bytes,
      uploadedBy: f.uploader_name,
      uploadedAt: f.created_at,
      downloadUrl: `/api/files/download/${f.id}`,
    })));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Download file ─────────────────────────────────────────────────────────
router.get("/download/:fileId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT filename, original_name, mime_type FROM room_files WHERE id = $1",
      [req.params.fileId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "File not found" });
    const file = result.rows[0];

    const filePath = path.join(uploadDir, file.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File missing from storage" });

    res.setHeader("Content-Disposition", `attachment; filename="${file.original_name}"`);
    res.setHeader("Content-Type", file.mime_type);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Handle multer errors
router.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File too large (max 50MB)" });
  if (err.message === "File type not allowed") return res.status(400).json({ error: err.message });
  next(err);
});

module.exports = router;
