import { useState, useEffect, useRef, useLayoutEffect } from "react";

// ── Module-level cache: persists across tab switches (unmount/remount) ─────
// Key: roomId, Value: array of messages
const _cache = {};

export function getCache(roomId)       { return _cache[roomId] ? [..._cache[roomId]] : []; }
export function pushCache(roomId, msg) {
  if (!_cache[roomId]) _cache[roomId] = [];
  if (!_cache[roomId].find(m => m.id === msg.id)) _cache[roomId].push(msg);
}
export function clearCache(roomId)     {
  if (roomId) delete _cache[roomId];
  else Object.keys(_cache).forEach(k => delete _cache[k]);
}

const _listeners = new Set();

export function registerChatListener(socket, roomId) {
  if (!socket?.current) return () => {};
  const sock = socket.current;

  const handler = (msg) => {
    pushCache(roomId, msg);
    // Notify all registered ChatPanel instances (if any are mounted)
    _listeners.forEach(fn => fn(msg));
  };

  // Remove old handler if re-registering
  sock.off("chat-message");
  sock.on("chat-message", handler);

  return () => sock.off("chat-message", handler);
}

export default function ChatPanel({ socket, roomId, user }) {
  const [messages, setMessages] = useState(() => getCache(roomId));
  const [input,    setInput]    = useState("");
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Register this panel instance to receive messages
  useEffect(() => {
    // Sync from cache first (messages that came in while tab was closed)
    setMessages(getCache(roomId));

    const listener = (msg) => {
      setMessages(prev => {
        // Deduplicate
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || !socket.current) return;
    socket.current.emit("chat-message", { roomId, message: text });
    setInput("");
    inputRef.current?.focus();
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  const getInitials = (name) =>
    name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const COLORS = ["#6c63ff","#10d9a0","#f59e0b","#ec4899","#3b82f6","#14b8a6"];
  const colorFor = (name) => COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];

  const grouped = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    const sameUser = prev?.userId === msg.userId;
    const closeTime = sameUser && (new Date(msg.timestamp) - new Date(prev.timestamp)) < 60000;
    acc.push({ ...msg, isGrouped: closeTime });
    return acc;
  }, []);

  return (
    <div style={s.panel}>
      <div style={s.messages}>
        {messages.length === 0 && (
          <div style={s.empty}>
            <div style={s.emptyIcon}>💬</div>
            <div style={s.emptyTitle}>No messages yet</div>
            <div style={s.emptySub}>Be the first to say something</div>
          </div>
        )}

        {grouped.map((msg) => {
          const isMe  = msg.userId === user?.id;
          const color = colorFor(msg.from);
          return (
            <div key={msg.id} style={{ ...s.row, ...(msg.isGrouped ? s.rowGrouped : {}), ...(isMe ? s.rowMe : {}) }}>
              {!isMe && !msg.isGrouped && (
                <div style={{ ...s.avatar, background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                  {getInitials(msg.from)}
                </div>
              )}
              {!isMe && msg.isGrouped && <div style={s.avatarSpacer} />}
              <div style={{ ...s.content, ...(isMe ? s.contentMe : {}) }}>
                {!msg.isGrouped && (
                  <div style={{ ...s.meta, ...(isMe ? { justifyContent: "flex-end" } : {}) }}>
                    <span style={s.fromName}>{isMe ? "You" : msg.from}</span>
                    <span style={s.time}>{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                <div style={{
                  ...s.bubble,
                  ...(isMe ? s.bubbleMe : s.bubbleThem),
                  ...(msg.isGrouped ? { borderRadius: isMe ? "14px 4px 14px 14px" : "4px 14px 14px 14px" } : {}),
                }}>
                  {msg.message}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={s.inputArea}>
        <div style={s.inputWrap}>
          <input
            ref={inputRef}
            style={s.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Message the room…"
            maxLength={500}
          />
          <button
            style={{ ...s.sendBtn, ...(input.trim() ? s.sendActive : {}) }}
            onClick={send}
            disabled={!input.trim()}
          >↑</button>
        </div>
        <div style={s.hint}>Press Enter to send</div>
      </div>
    </div>
  );
}

const s = {
  panel:       { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },
  messages:    { flex: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 },
  empty:       { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8 },
  emptyIcon:   { fontSize: 32, opacity: 0.4 },
  emptyTitle:  { fontSize: 14, fontWeight: 600, color: "#3d4258" },
  emptySub:    { fontSize: 12, color: "#2a2f42" },
  row:         { display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 2 },
  rowGrouped:  { marginBottom: 1 },
  rowMe:       { flexDirection: "row-reverse" },
  avatar:      { width: 28, height: 28, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, marginBottom: 2 },
  avatarSpacer:{ width: 28, flexShrink: 0 },
  content:     { maxWidth: "75%", display: "flex", flexDirection: "column", gap: 3 },
  contentMe:   { alignItems: "flex-end" },
  meta:        { display: "flex", alignItems: "baseline", gap: 6, padding: "0 4px" },
  fromName:    { fontSize: 11, fontWeight: 700, color: "#4a5068" },
  time:        { fontSize: 10, color: "#2a2f42" },
  bubble:      { padding: "8px 12px", fontSize: 13, lineHeight: 1.55, wordBreak: "break-word" },
  bubbleThem:  { background: "rgba(255,255,255,0.05)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)", borderRadius: "4px 14px 14px 14px", color: "#c8ccd8" },
  bubbleMe:    { background: "linear-gradient(135deg, rgba(108,99,255,0.7), rgba(167,139,250,0.6))", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(108,99,255,0.3)", borderRadius: "14px 4px 14px 14px", color: "#fff" },
  inputArea:   { padding: "10px 12px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" },
  inputWrap:   { display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.04)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "4px 4px 4px 12px" },
  input:       { flex: 1, background: "transparent", border: "none", color: "#eef0f6", fontSize: 13, outline: "none", padding: "6px 0", fontFamily: "inherit" },
  sendBtn:     { width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.05)", border: "none", color: "#3d4258", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0, fontSize: 14, fontWeight: 700 },
  sendActive:  { background: "linear-gradient(135deg, #6c63ff, #a78bfa)", color: "#fff" },
  hint:        { fontSize: 10, color: "#2a2f42", textAlign: "center", marginTop: 5 },
};
