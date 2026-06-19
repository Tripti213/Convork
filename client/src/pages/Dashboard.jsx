import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("create");
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const createRoom = async () => {
    if (!roomName.trim()) return setError("Enter a meeting name");
    setError(""); setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/rooms"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: roomName, password: roomPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate(`/room/${data.id}?code=${data.code}&name=${encodeURIComponent(data.name)}&isHost=true`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return setError("Enter a room code");
    setError(""); setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/rooms/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: joinCode, password: joinPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate(`/room/${data.id}?code=${data.code}&name=${encodeURIComponent(data.name)}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      {/* ── Geometric background (Adapted for Light Mode) ── */}
      <div style={s.bg}>
        <div style={s.mesh1} />
        <div style={s.mesh2} />
        <div style={s.mesh3} />
        <div style={s.gridBg} />
        <svg style={s.geoBg} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <polygon points="80,60 130,32 180,60 180,116 130,144 80,116" fill="none" stroke="rgba(108,99,255,0.25)" strokeWidth="1.5" style={{ animation: "geo-spin 42s linear infinite", transformOrigin: "130px 88px" }} />
          <polygon points="1260,80 1310,52 1360,80 1360,136 1310,164 1260,136" fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="1.5" style={{ animation: "geo-spin 36s linear infinite reverse", transformOrigin: "1310px 108px" }} />
          <circle cx="40" cy="500" r="80" fill="none" stroke="rgba(108,99,255,0.15)" strokeWidth="1" strokeDasharray="10 7" />
          <path d="M 0 880 Q 360 850 720 880 Q 1080 910 1440 880" fill="none" stroke="rgba(108,99,255,0.1)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* ── Navbar ── */}
      <nav style={s.nav}>
        <div style={s.navBrand} onClick={() => navigate("/")} >
          <ConvorkMark size={26} />
          <span style={s.navName}>Convork</span>
        </div>
        <div style={s.navRight}>
          <button style={s.navCta} onClick={() => navigate("/notes")}>
            My Notes
          </button>
          <div style={s.greeting}>
            Good {getGreeting()}, <strong style={{ color: "#0f172a" }}>{user?.name?.split(" ")[0]}</strong>
          </div>
          <div style={s.userChip} onClick={() => setShowUserMenu(v => !v)}>
            <div style={{ ...s.userAvatar, background: user?.avatarColor || "#6c63ff" }}>{initials}</div>
            <span style={s.userName}>{user?.name}</span>
            <span style={s.chevron}>▾</span>
            {showUserMenu && (
              <div style={s.userMenu}>
                <div style={s.menuEmail}>{user?.email}</div>
                <div style={s.menuDivider} />
                <button style={s.menuBtn} onClick={logout}>Sign out →</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Content ── */}
      <div style={{ ...s.content, opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>

        <div style={s.heroText}>
          <div style={s.eyebrow}>
            <span style={s.eyebrowDot} />
            Ready to collaborate
          </div>
          <h1 style={s.h1}>
            Start your <span style={s.h1Accent}>workspace</span>
          </h1>
          <p style={s.heroSub}>Create a new room or jump into an existing one.</p>
        </div>

        <div style={s.card}>
          <div style={s.tabs}>
            <button
              style={{ ...s.tab, ...(tab === "create" ? s.tabActive : {}) }}
              onClick={() => { setTab("create"); setError(""); }}
            >
              <span>✦</span> New meeting
            </button>
            <button
              style={{ ...s.tab, ...(tab === "join" ? s.tabActive : {}) }}
              onClick={() => { setTab("join"); setError(""); }}
            >
              <span>→</span> Join with code
            </button>
          </div>

          <div style={s.formBody}>
            {tab === "create" ? (
              <>
                <InputField label="Meeting name" placeholder="e.g. Sprint Review"
                  value={roomName} onChange={e => setRoomName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createRoom()} />
                <InputField label="Password (optional)" type="password"
                  placeholder="Leave blank for open room"
                  value={roomPassword} onChange={e => setRoomPassword(e.target.value)} />
                {error && <ErrorMsg msg={error} />}
                <button
                  style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
                  onClick={createRoom} disabled={loading}
                >
                  {loading
                    ? <span style={s.spinner} />
                    : <><span>Start meeting</span><span>🎥</span></>}
                </button>
              </>
            ) : (
              <>
                <InputField label="Room code" placeholder="NXM-XXXX"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && joinRoom()}
                  mono maxLength={8} />
                <InputField label="Room password (if required)" type="password"
                  placeholder="Leave blank if not needed"
                  value={joinPassword} onChange={e => setJoinPassword(e.target.value)} />
                {error && <ErrorMsg msg={error} />}
                <button
                  style={{ ...s.btn, background: "rgba(15,23,42,0.02)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(108,99,255,0.3)", boxShadow: "none", color: "#475569", ...(loading ? s.btnDisabled : {}) }}
                  onClick={joinRoom} disabled={loading}
                >
                  {loading
                    ? <span style={s.spinner} />
                    : <><span>Join meeting</span><span>→</span></>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function ConvorkMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ cursor: "pointer", filter: "drop-shadow(0 2px 8px rgba(108,99,255,0.2))" }}>
      <rect width="32" height="32" rx="9" fill="url(#dmg)" />
      <rect x="5" y="10" width="14" height="12" rx="3" fill="white" opacity="0.9" />
      <polygon points="19,13 27,9 27,23 19,19" fill="white" opacity="0.8" />
      <circle cx="12" cy="16" r="3" fill="url(#dmg2)" />
      <defs>
        <linearGradient id="dmg" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#6c63ff" /><stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="dmg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10d9a0" /><stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function InputField({ label, type = "text", placeholder, value, onChange, onKeyDown, mono, maxLength }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: focused ? "#6c63ff" : "#64748b", marginBottom: 8, transition: "color 0.2s" }}>
        {label}
      </label>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={onChange} onKeyDown={onKeyDown} maxLength={maxLength}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: "100%", padding: "12px 14px", background: "rgba(15,23,42,0.02)", borderWidth: "1px", borderStyle: "solid", borderColor: focused ? "rgba(108,99,255,0.4)" : "rgba(15,23,42,0.1)", borderRadius: 10, color: "#0f172a", fontSize: 14, outline: "none", fontFamily: mono ? "'DM Mono', monospace" : "inherit", letterSpacing: mono ? "0.15em" : "normal", transition: "all 0.2s" }}
      />
    </div>
  );
}

function ErrorMsg({ msg }) {
  return (
    <div style={{ padding: "10px 14px", background: "rgba(255,77,109,0.06)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,77,109,0.2)", borderRadius: 10, color: "#ff4d6d", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      <span>⚠</span> {msg}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "'DM Sans', sans-serif", position: "relative", overflowX: "hidden" },
  bg: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" },
  mesh1: { position: "absolute", top: "-15%", left: "-5%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.06) 0%, transparent 65%)" },
  mesh2: { position: "absolute", bottom: "-20%", right: "-5%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 65%)" },
  mesh3: { position: "absolute", top: "40%", left: "40%", width: "40vw", height: "40vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,217,160,0.04) 0%, transparent 65%)" },
  gridBg: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(15,23,42,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.02) 1px, transparent 1px)", backgroundSize: "64px 64px" },
  geoBg: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  nav: { position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", height: 62, borderBottom: "1px solid rgba(15,23,42,0.06)", backdropFilter: "blur(16px)", background: "rgba(248,250,252,0.8)" },
  navBrand: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  navName: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "-0.3px", color: "#0f172a" },
  navRight: { display: "flex", alignItems: "center", gap: 20 },
  navCta: { background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none", borderRadius: 9, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(108,99,255,0.25)", transition: "all 0.2s" },
  greeting: { fontSize: 13, color: "#64748b" },
  userChip: { display: "flex", alignItems: "center", gap: 8, padding: "5px 12px 5px 6px", background: "rgba(15,23,42,0.04)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.08)", borderRadius: 99, cursor: "pointer", position: "relative" },
  userAvatar: { width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" },
  userName: { fontSize: 13, fontWeight: 600, color: "#475569" },
  chevron: { fontSize: 10, color: "#94a3b8" },
  userMenu: { position: "absolute", top: "calc(100% + 10px)", right: 0, background: "rgba(255,255,255,0.98)", backdropFilter: "blur(20px)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.08)", borderRadius: 14, padding: 8, minWidth: 200, zIndex: 100, boxShadow: "0 20px 40px rgba(15,23,42,0.08)" },
  menuEmail: { padding: "8px 12px", fontSize: 12, color: "#64748b" },
  menuDivider: { height: 1, background: "rgba(15,23,42,0.05)", margin: "4px 0" },
  menuBtn: { width: "100%", padding: "10px 12px", background: "transparent", border: "none", color: "#ff4d6d", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 8, textAlign: "left" },
  content: { position: "relative", zIndex: 1, maxWidth: 540, margin: "0 auto", padding: "80px 24px" },
  heroText: { textAlign: "center", marginBottom: 40 },
  eyebrow: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6c63ff", background: "rgba(108,99,255,0.08)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(108,99,255,0.15)", borderRadius: 99, padding: "6px 18px", marginBottom: 20 },
  eyebrowDot: { width: 7, height: 7, borderRadius: "50%", background: "#10d9a0", boxShadow: "0 0 8px rgba(16,217,160,0.4)" },
  h1: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 42, letterSpacing: "-1.5px", color: "#0f172a", marginBottom: 12 },
  h1Accent: { background: "linear-gradient(135deg, #6c63ff, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
  heroSub: { fontSize: 16, color: "#475569" },
  card: { background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.08)", borderRadius: 24, overflow: "hidden", boxShadow: "0 30px 60px rgba(15,23,42,0.05)", marginBottom: 32 },
  tabs: { display: "flex", borderBottom: "1px solid rgba(15,23,42,0.06)" },
  tab: { flex: 1, padding: "18px 12px", background: "transparent", border: "none", color: "#64748b", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" },
  tabActive: { color: "#6c63ff", background: "rgba(108,99,255,0.04)", borderBottom: "2px solid #6c63ff" },
  formBody: { padding: "32px" },
  btn: { width: "100%", padding: "15px", borderRadius: 12, background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 8px 24px rgba(108,99,255,0.25)", transition: "all 0.2s", marginTop: 8 },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  spinner: { width: 16, height: 16, borderRadius: "50%", borderWidth: "2px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite", display: "inline-block" },
  features: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
  featureChip: { display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "rgba(255,255,255,0.5)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.06)", borderRadius: 14, animation: "slide-in-up 0.4s both", backdropFilter: "blur(10px)" },
  chipLabel: { fontSize: 12, fontWeight: 600, color: "#475569" },
};