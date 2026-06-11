import { useState, useEffect, useRef } from "react";

export default function ChatPanel({ socket, roomId, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!socket.current) return;
    const sock = socket.current;
    const handleMessage = (msg) => setMessages(prev => [...prev, msg]);
    sock.on("chat-message", handleMessage);
    return () => sock.off("chat-message", handleMessage);
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    socket.current?.emit("chat-message", { roomId, message: text });
    setInput("");
    inputRef.current?.focus();
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  const getInitials = (name) =>
    name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const AVATAR_COLORS = ["#6c63ff","#10d9a0","#f59e0b","#ec4899","#3b82f6","#14b8a6"];
  const colorFor = (name) => AVATAR_COLORS[name?.charCodeAt(0) % AVATAR_COLORS.length] || "#6c63ff";

  // Group consecutive messages from same sender
  const grouped = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    const isGrouped = prev && prev.userId === msg.userId &&
      new Date(msg.timestamp) - new Date(prev.timestamp) < 60000;
    acc.push({ ...msg, isGrouped });
    return acc;
  }, []);

  return (
    <div style={s.panel}>
      {/* Messages */}
      <div style={s.messages}>
        {messages.length === 0 && (
          <div style={s.empty}>
            <div style={s.emptyIcon}>💬</div>
            <div style={s.emptyTitle}>No messages yet</div>
            <div style={s.emptySub}>Be the first to say something</div>
          </div>
        )}

        {grouped.map((msg) => {
          const isMe = msg.userId === user?.id;
          const color = colorFor(msg.from);

          return (
            <div key={msg.id} style={{ ...s.msgRow, ...(msg.isGrouped ? s.msgGrouped : {}), ...(isMe ? s.msgRowMe : {}) }}>
              {!isMe && !msg.isGrouped && (
                <div style={{ ...s.avatar, background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                  {getInitials(msg.from)}
                </div>
              )}
              {!isMe && msg.isGrouped && <div style={s.avatarSpacer} />}

              <div style={{ ...s.msgContent, ...(isMe ? s.msgContentMe : {}) }}>
                {!msg.isGrouped && (
                  <div style={{ ...s.msgMeta, ...(isMe ? { justifyContent: "flex-end" } : {}) }}>
                    <span style={s.msgName}>{isMe ? "You" : msg.from}</span>
                    <span style={s.msgTime}>{formatTime(msg.timestamp)}</span>
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

      {/* Input area */}
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
            style={{ ...s.sendBtn, ...(input.trim() ? s.sendBtnActive : {}) }}
            onClick={send}
            disabled={!input.trim()}
          >
            <span style={s.sendIcon}>↑</span>
          </button>
        </div>
        <div style={s.inputHint}>Press Enter to send</div>
      </div>
    </div>
  );
}

const s = {
  panel: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },
  messages: { flex: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 },
  empty: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8 },
  emptyIcon: { fontSize: 32, marginBottom: 4, opacity: 0.4 },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: "#3d4258" },
  emptySub: { fontSize: 12, color: "#2a2f42" },

  msgRow: { display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 2, animation: "slide-in-up 0.2s ease" },
  msgGrouped: { marginBottom: 1 },
  msgRowMe: { flexDirection: "row-reverse" },

  avatar: { width: 28, height: 28, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, marginBottom: 2 },
  avatarSpacer: { width: 28, flexShrink: 0 },

  msgContent: { maxWidth: "75%", display: "flex", flexDirection: "column", gap: 3 },
  msgContentMe: { alignItems: "flex-end" },

  msgMeta: { display: "flex", alignItems: "baseline", gap: 6, padding: "0 4px" },
  msgName: { fontSize: 11, fontWeight: 700, color: "#4a5068", letterSpacing: "0.02em" },
  msgTime: { fontSize: 10, color: "#2a2f42" },

  bubble: { padding: "8px 12px", fontSize: 13, lineHeight: 1.55, wordBreak: "break-word", maxWidth: "100%" },
  bubbleThem: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px 14px 14px 14px", color: "#c8ccd8" },
  bubbleMe: { background: "linear-gradient(135deg, rgba(108,99,255,0.7), rgba(167,139,250,0.6))", border: "1px solid rgba(108,99,255,0.3)", borderRadius: "14px 4px 14px 14px", color: "#fff", boxShadow: "0 2px 12px rgba(108,99,255,0.2)" },

  inputArea: { padding: "10px 12px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" },
  inputWrap: { display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "4px 4px 4px 12px", transition: "border-color 0.2s" },
  input: { flex: 1, background: "transparent", border: "none", color: "#eef0f6", fontSize: 13, outline: "none", padding: "6px 0", fontFamily: "inherit" },
  sendBtn: { width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.05)", border: "none", color: "#3d4258", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 },
  sendBtnActive: { background: "linear-gradient(135deg, #6c63ff, #a78bfa)", color: "#fff", boxShadow: "0 2px 8px rgba(108,99,255,0.4)" },
  sendIcon: { fontSize: 14, fontWeight: 700 },
  inputHint: { fontSize: 10, color: "#2a2f42", textAlign: "center", marginTop: 5, letterSpacing: "0.04em" },
};
