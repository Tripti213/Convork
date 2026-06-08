import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("create"); // "create" | "join"
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const createRoom = async () => {
    if (!roomName.trim()) return setError("Enter a room name");
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: roomName, password: roomPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate(`/room/${data.id}?code=${data.code}&name=${encodeURIComponent(data.name)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return setError("Enter a room code");
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: joinCode, password: joinPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate(`/room/${data.id}?code=${data.code}&name=${encodeURIComponent(data.name)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.brand}><div style={s.dot} />Convork</div>
        <div style={s.userInfo}>
          <div style={{ ...s.avatar, background: user?.avatarColor || "#3b82f6" }}>{initials}</div>
          <span style={s.userName}>{user?.name}</span>
          <button style={s.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </nav>

      <div style={s.content}>
        <h1 style={s.heading}>Start or join a meeting</h1>
        <p style={s.sub}>Secure video calls with end-to-end encryption</p>

        <div style={s.card}>
          <div style={s.tabs}>
            {["create", "join"].map((t) => (
              <button
                key={t}
                style={{ ...s.tabBtn, ...(tab === t ? s.tabActive : {}) }}
                onClick={() => { setTab(t); setError(""); }}
              >
                {t === "create" ? "New meeting" : "Join with code"}
              </button>
            ))}
          </div>

          {tab === "create" ? (
            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Meeting name</label>
                <input
                  style={s.input}
                  placeholder="e.g. Weekly Standup"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createRoom()}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Password (optional)</label>
                <input
                  style={s.input}
                  type="password"
                  placeholder="Leave blank for open room"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                />
              </div>
              {error && <div style={s.error}>{error}</div>}
              <button style={s.btn} onClick={createRoom} disabled={loading}>
                {loading ? "Creating…" : "🎥  Start meeting"}
              </button>
            </div>
          ) : (
            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Room code</label>
                <input
                  style={{ ...s.input, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}
                  placeholder="NXM-XXXX"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                  maxLength={8}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Room password (if required)</label>
                <input
                  style={s.input}
                  type="password"
                  placeholder="Leave blank if no password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                />
              </div>
              {error && <div style={s.error}>{error}</div>}
              <button style={s.btn} onClick={joinRoom} disabled={loading}>
                {loading ? "Joining…" : "→  Join meeting"}
              </button>
            </div>
          )}
        </div>

        <div style={s.features}>
          {[
            { icon: "🔒", label: "E2E Encrypted" },
            { icon: "📺", label: "Screen Sharing" },
            { icon: "✏️", label: "Whiteboard" },
            { icon: "📁", label: "File Sharing" },
          ].map((f) => (
            <div key={f.label} style={s.featureChip}>
              <span>{f.icon}</span>
              <span style={{ color: "#7c8490", fontSize: 13 }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#0d0f11", fontFamily: "'DM Sans', sans-serif", color: "#e8eaed" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#161a1e" },
  brand: { display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 15 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 8px rgba(59,130,246,0.6)" },
  userInfo: { display: "flex", alignItems: "center", gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff" },
  userName: { fontSize: 14, color: "#a0a6b0" },
  logoutBtn: { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "5px 12px", color: "#7c8490", cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  content: { maxWidth: 480, margin: "0 auto", padding: "60px 20px 40px" },
  heading: { fontSize: 28, fontWeight: 600, marginBottom: 8, letterSpacing: -0.5 },
  sub: { color: "#7c8490", fontSize: 15, marginBottom: 32 },
  card: { background: "#161a1e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" },
  tabs: { display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)" },
  tabBtn: { flex: 1, padding: "14px", background: "transparent", border: "none", color: "#7c8490", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", borderBottom: "2px solid transparent", transition: "all 0.15s" },
  tabActive: { color: "#3b82f6", borderBottomColor: "#3b82f6" },
  form: { padding: 24, display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "#a0a6b0" },
  input: { background: "#1e2329", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", color: "#e8eaed", fontSize: 14, outline: "none", fontFamily: "inherit" },
  btn: { background: "#3b82f6", border: "none", borderRadius: 8, padding: 12, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  error: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 },
  features: { display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" },
  featureChip: { display: "flex", alignItems: "center", gap: 6, background: "#161a1e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 99, padding: "6px 14px", fontSize: 13 },
};
