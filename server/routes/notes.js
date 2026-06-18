const express = require("express");
const { pool } = require("../config/db");

const router = express.Router();

// ─── Get notes for a specific room (current user's own notes only) ──────────
router.get("/room/:roomId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, content, updated_at FROM meeting_notes
       WHERE user_id = $1 AND room_id = $2`,
      [req.user.id, req.params.roomId]
    );
    if (result.rows.length === 0) {
      return res.json({ content: "", updatedAt: null });
    }
    res.json({
      content: result.rows[0].content,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (err) {
    console.error("Get notes error:", err.message);
    res.status(500).json({ error: "Failed to load notes" });
  }
});

// ─── Save/update notes for a room (upsert — autosave-friendly) ──────────────
router.put("/room/:roomId", async (req, res) => {
  const { content } = req.body;
  if (typeof content !== "string") {
    return res.status(400).json({ error: "Content must be a string" });
  }
  if (content.length > 50000) {
    return res.status(400).json({ error: "Notes too long (max 50,000 characters)" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO meeting_notes (user_id, room_id, content, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, room_id)
       DO UPDATE SET content = $3, updated_at = NOW()
       RETURNING updated_at`,
      [req.user.id, req.params.roomId, content]
    );
    res.json({ saved: true, updatedAt: result.rows[0].updated_at });
  } catch (err) {
    console.error("Save notes error:", err.message);
    res.status(500).json({ error: "Failed to save notes" });
  }
});

// ─── Get all notes for the current user, across all rooms (history view) ────
router.get("/all", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mn.id, mn.content, mn.updated_at, mn.created_at,
              r.id as room_id, r.name as room_name, r.code as room_code
       FROM meeting_notes mn
       JOIN rooms r ON mn.room_id = r.id
       WHERE mn.user_id = $1 AND mn.content != ''
       ORDER BY mn.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows.map(n => ({
      id: n.id,
      content: n.content,
      updatedAt: n.updated_at,
      createdAt: n.created_at,
      roomId: n.room_id,
      roomName: n.room_name,
      roomCode: n.room_code,
    })));
  } catch (err) {
    console.error("Get all notes error:", err.message);
    res.status(500).json({ error: "Failed to load notes" });
  }
});

// ─── Delete a note ────────────────────────────────────────────────────────────
router.delete("/:noteId", async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM meeting_notes WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.noteId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error("Delete note error:", err.message);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

module.exports = router;
