const { pool } = require("../config/db");
const fs = require("fs");
const path = require("path");

const ROOM_TTL_HOURS = 24; // rooms inactive for 24h get marked inactive
const FILE_RETENTION_DAYS = 7; // files older than 7 days in expired rooms get deleted

const uploadDir = path.join(__dirname, "../uploads");

// ─── Mark stale rooms as inactive ─────────────────────────────────────────────
async function expireStaleRooms() {
  try {
    const result = await pool.query(
      `UPDATE rooms
       SET is_active = false
       WHERE is_active = true
         AND created_at < NOW() - INTERVAL '${ROOM_TTL_HOURS} hours'
       RETURNING id, code`
    );
    if (result.rows.length > 0) {
      console.log(`[Cleanup] Expired ${result.rows.length} stale room(s)`);
    }
  } catch (err) {
    console.error("[Cleanup] Failed to expire rooms:", err.message);
  }
}

// ─── Delete files belonging to old, inactive rooms ────────────────────────────
async function purgeOldFiles() {
  try {
    const result = await pool.query(
      `SELECT rf.id, rf.filename
       FROM room_files rf
       JOIN rooms r ON rf.room_id = r.id
       WHERE r.is_active = false
         AND rf.created_at < NOW() - INTERVAL '${FILE_RETENTION_DAYS} days'`
    );

    for (const file of result.rows) {
      const filePath = path.join(uploadDir, file.filename);
      fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error(`[Cleanup] Failed to delete ${file.filename}:`, err.message);
        }
      });
    }

    if (result.rows.length > 0) {
      const ids = result.rows.map(f => f.id);
      await pool.query(`DELETE FROM room_files WHERE id = ANY($1::uuid[])`, [ids]);
      console.log(`[Cleanup] Purged ${result.rows.length} old file(s)`);
    }
  } catch (err) {
    console.error("[Cleanup] Failed to purge files:", err.message);
  }
}

// ─── Clean orphaned temp files (encryption temp dir) ──────────────────────────
function cleanTempFiles() {
  const tempDir = path.join(uploadDir, ".tmp");
  if (!fs.existsSync(tempDir)) return;

  const ONE_HOUR = 60 * 60 * 1000;
  fs.readdir(tempDir, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        // Delete temp files older than 1 hour (failed/incomplete uploads)
        if (Date.now() - stats.mtimeMs > ONE_HOUR) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}

// ─── Run all cleanup tasks ─────────────────────────────────────────────────────
async function runCleanup() {
  console.log("[Cleanup] Running scheduled cleanup...");
  await expireStaleRooms();
  await purgeOldFiles();
  cleanTempFiles();
}

// ─── Start the cleanup scheduler ───────────────────────────────────────────────
// Runs once on startup, then every hour
function startCleanupScheduler() {
  runCleanup(); // run immediately on boot

  const ONE_HOUR_MS = 60 * 60 * 1000;
  setInterval(runCleanup, ONE_HOUR_MS);

  console.log(`[Cleanup] Scheduler started — rooms expire after ${ROOM_TTL_HOURS}h, files purge after ${FILE_RETENTION_DAYS}d`);
}

module.exports = { startCleanupScheduler, runCleanup };
