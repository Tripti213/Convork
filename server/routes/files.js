const express  = require("express");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const crypto   = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../config/db");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads");
const tempDir   = path.join(__dirname, "../uploads/.tmp");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(tempDir))   fs.mkdirSync(tempDir,   { recursive: true });

const ALGORITHM       = "aes-256-gcm";
const SALT_LENGTH     = 32;
const IV_LENGTH       = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH      = 32;

function deriveKey(salt) {
  const secret = process.env.FILE_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error("FILE_ENCRYPTION_KEY not configured");
  return crypto.scryptSync(secret, salt, KEY_LENGTH);
}

function encryptBuffer(plain) {
  const salt    = crypto.randomBytes(SALT_LENGTH);
  const iv      = crypto.randomBytes(IV_LENGTH);
  const key     = deriveKey(salt);
  const cipher  = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc     = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, authTag, enc]);
}

function decryptBuffer(buf) {
  if (buf.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("File too small to be a valid encrypted file");
  }
  const salt    = buf.subarray(0, SALT_LENGTH);
  const iv      = buf.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = buf.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const enc     = buf.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const key     = deriveKey(salt);
  const dec     = crypto.createDecipheriv(ALGORITHM, key, iv);
  dec.setAuthTag(authTag);
  return Buffer.concat([dec.update(enc), dec.final()]);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename:    (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}.tmp`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const blocked = [".exe",".bat",".sh",".cmd",".msi",".dll",".scr"];
    if (blocked.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error("File type not allowed"));
    }
    cb(null, true);
  },
});

// ── Upload ─────────────────────────────────────────────────────────────────
router.post("/upload/:roomId", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const tempPath = req.file.path;
  const encName  = `${uuidv4()}.enc`;
  const encPath  = path.join(uploadDir, encName);

  try {
    const plain = fs.readFileSync(tempPath);
    const enc   = encryptBuffer(plain);
    fs.writeFileSync(encPath, enc);
    fs.unlink(tempPath, () => {});

    const result = await pool.query(
      `INSERT INTO room_files (room_id, uploaded_by, filename, original_name, mime_type, size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, original_name, mime_type, size_bytes, created_at`,
      [req.params.roomId, req.user.id, encName,
       req.file.originalname, req.file.mimetype, req.file.size]
    );
    const f = result.rows[0];
    res.json({ id: f.id, name: f.original_name, mimeType: f.mime_type, size: f.size_bytes,
               uploadedAt: f.created_at, downloadUrl: `/api/files/download/${f.id}` });
  } catch (err) {
    fs.unlink(tempPath, () => {});
    fs.unlink(encPath,  () => {});
    console.error("Upload error:", err.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ── List ───────────────────────────────────────────────────────────────────
router.get("/room/:roomId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rf.id, rf.original_name, rf.mime_type, rf.size_bytes, rf.created_at,
              u.name AS uploader_name
       FROM room_files rf JOIN users u ON rf.uploaded_by = u.id
       WHERE rf.room_id = $1 ORDER BY rf.created_at DESC`,
      [req.params.roomId]
    );
    res.json(result.rows.map(f => ({
      id: f.id, name: f.original_name, mimeType: f.mime_type,
      size: f.size_bytes, uploadedBy: f.uploader_name,
      uploadedAt: f.created_at, downloadUrl: `/api/files/download/${f.id}`,
    })));
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.get("/download/:fileId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT filename, original_name, mime_type FROM room_files WHERE id = $1",
      [req.params.fileId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "File not found" });
    const f = result.rows[0];

    const encPath = path.join(uploadDir, f.filename);
    if (!fs.existsSync(encPath)) return res.status(404).json({ error: "File missing from storage" });

    let plain;
    try {
      const enc = fs.readFileSync(encPath);
      plain = decryptBuffer(enc);
    } catch (decErr) {
      console.error("Decrypt error:", decErr.message);
      return res.status(422).json({
        error: "File could not be decrypted. It may have been uploaded before encryption was enabled — please re-upload.",
      });
    }

    // These 3 headers together fix both Chrome and Safari issues
    res.setHeader("Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(f.original_name)}`);
    res.setHeader("Content-Type", f.mime_type || "application/octet-stream");
    res.setHeader("Content-Length", plain.length);
    // Prevent caching of sensitive files
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(plain);

  } catch (err) {
    console.error("Download error:", err.message);
    res.status(500).json({ error: "Download failed" });
  }
});

router.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File too large (max 50MB)" });
  if (err.message === "File type not allowed") return res.status(400).json({ error: err.message });
  next(err);
});

module.exports = router;
