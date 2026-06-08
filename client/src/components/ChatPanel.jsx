import { useState, useEffect, useRef } from "react";

export default function ChatPanel({ socket, roomId, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket.current) return;
    const sock = socket.current;

    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    sock.on("chat-message", handleMessage);
    return () => sock.off("chat-message", handleMessage);
  }, [socket]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    socket.current?.emit("chat-message", { roomId, message: text });
    setInput("");
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const getInitials = (name) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div style={styles.panel}>
      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.empty}>No messages yet. Say hello! 👋</div>
        )}
        {messages.map((msg) => {
          const isMe = msg.userId === user?.id;
          return (
            <div key={msg.id} style={{ ...styles.msg, ...(isMe ? styles.msgMe : {}) }}>
              {!isMe && (
                <div style={{ ...styles.avatar, background: "#3b82f6" }}>
                  {getInitials(msg.from)}
                </div>
              )}
              <div style={styles.msgBody}>
                <div style={styles.msgHeader}>
                  <span style={styles.msgName}>{isMe ? "You" : msg.from}</span>
                  <span style={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                </div>
                <div style={{ ...styles.bubble, ...(isMe ? styles.bubbleMe : {}) }}>
                  {msg.message}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Message everyone…"
          maxLength={500}
        />
        <button style={styles.sendBtn} onClick={send} disabled={!input.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
}

const styles = {
  panel: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },
  messages: { flex: 1, overflowY: "auto", padding: "12px 0", display: "flex", flexDirection: "column", gap: 2 },
  empty: { padding: "24px 16px", textAlign: "center", color: "#7c8490", fontSize: 13 },
  msg: { display: "flex", gap: 8, padding: "4px 12px", alignItems: "flex-start" },
  msgMe: { flexDirection: "row-reverse" },
  avatar: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0, marginTop: 2 },
  msgBody: { flex: 1, maxWidth: "80%" },
  msgHeader: { display: "flex", alignItems: "baseline", gap: 5, marginBottom: 2, justifyContent: "flex-start" },
  msgName: { fontSize: 12, fontWeight: 600, color: "#a0a6b0" },
  msgTime: { fontSize: 10, color: "#5a6270" },
  bubble: { background: "#1e2329", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0 8px 8px 8px", padding: "7px 10px", fontSize: 13, color: "#e8eaed", lineHeight: 1.5, wordBreak: "break-word" },
  bubbleMe: { background: "rgba(59,130,246,0.2)", borderColor: "rgba(59,130,246,0.3)", borderRadius: "8px 0 8px 8px", color: "#e8eaed" },
  inputArea: { padding: "12px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 8, alignItems: "center" },
  input: { flex: 1, background: "#1e2329", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 12px", color: "#e8eaed", fontSize: 13, outline: "none", fontFamily: "inherit" },
  sendBtn: { width: 34, height: 34, borderRadius: 8, background: "#3b82f6", border: "none", color: "#fff", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s" },
};
