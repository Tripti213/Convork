import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const [mounted, setMounted] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Geometric background (Light Theme) */}
      <div style={s.bg}>
        <div style={s.mesh1} />
        <div style={s.mesh2} />
        <div style={s.gridBg} />
        <svg style={s.geoBg} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <polygon points="100,80 160,46 220,80 220,148 160,182 100,148" fill="none" stroke="rgba(108,99,255,0.25)" strokeWidth="1.5" style={{ animation: "geo-spin 45s linear infinite", transformOrigin: "160px 114px" }} />
          <polygon points="1200,100 1270,58 1340,100 1340,184 1270,226 1200,184" fill="none" stroke="rgba(167,139,250,0.22)" strokeWidth="1.5" style={{ animation: "geo-spin 38s linear infinite reverse", transformOrigin: "1270px 142px" }} />
          <circle cx="60" cy="450" r="70" fill="none" stroke="rgba(108,99,255,0.15)" strokeWidth="1" strokeDasharray="8 6" style={{ animation: "geo-spin 22s linear infinite" }} />
          <circle cx="1400" cy="500" r="90" fill="none" stroke="rgba(16,217,160,0.15)" strokeWidth="1" strokeDasharray="10 8" style={{ animation: "geo-spin 28s linear infinite reverse" }} />
          <polygon points="80,750 130,670 180,750" fill="none" stroke="rgba(16,217,160,0.25)" strokeWidth="1.5" style={{ animation: "geo-float 9s ease-in-out infinite" }} />
          <polygon points="1300,700 1350,620 1400,700" fill="none" stroke="rgba(108,99,255,0.2)" strokeWidth="1.5" style={{ animation: "geo-float 11s ease-in-out infinite reverse" }} />
          <polygon points="1320,350 1360,310 1400,350 1360,390" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="1" style={{ animation: "geo-float 8s ease-in-out infinite" }} />
          
          {/* dots */}
          {Array.from({ length: 5 }, (_, r) => Array.from({ length: 8 }, (_, c) => (
            <circle key={`${r}-${c}`} cx={80 + c * 180} cy={100 + r * 160} r="1.5" fill={`rgba(108,99,255,${0.12 + Math.sin(r * c) * 0.04})`} />
          )))}
          
          {/* Video camera hint */}
          <g transform="translate(1100, 650)" opacity="0.1" style={{ animation: "geo-float 16s ease-in-out infinite" }}>
            <rect x="-50" y="-28" width="80" height="56" rx="8" fill="none" stroke="#6c63ff" strokeWidth="2" />
            <polygon points="30,-20 58,-34 58,34 30,20" fill="none" stroke="#6c63ff" strokeWidth="2" />
          </g>
          
          {/* Signal arc hint */}
          <g transform="translate(340, 800)" opacity="0.12" style={{ animation: "geo-float 13s ease-in-out infinite reverse" }}>
            <path d="M -40 20 Q -20 -10 0 -20 Q 20 -10 40 20" fill="none" stroke="#10d9a0" strokeWidth="2" strokeLinecap="round" />
            <path d="M -25 20 Q -12 2 0 -4 Q 12 2 25 20" fill="none" stroke="#10d9a0" strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="22" r="4" fill="#10d9a0" />
          </g>
        </svg>
        
        {/* Particles */}
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: `${(i * 41 + 5) % 100}%`, top: `${(i * 67 + 10) % 100}%`, width: 3, height: 3, borderRadius: "50%", background: i % 3 === 0 ? "rgba(16,217,160,0.5)" : "rgba(108,99,255,0.4)", animation: `particle-float ${5 + (i % 5)}s ${i % 4 * 0.8}s ease-in-out infinite alternate`, pointerEvents: "none" }} />
        ))}
      </div>

      {/* Back to home */}
      <Link to="/" style={s.backLink}>← Convork</Link>

      {/* Card */}
      <div style={{ ...s.card, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Logo */}
        <div style={s.logo}>
          <ConvorkMark />
          <span style={s.logoText}>Convork</span>
        </div>

        <h1 style={s.h1}>{mode === "login" ? "Welcome back" : "Join Convork"}</h1>
        <p style={s.sub}>{mode === "login" ? "Sign in to your workspace" : "Create your free account"}</p>

        {/* Mode tabs */}
        <div style={s.tabs}>
          <div style={{ ...s.tabSlider, transform: `translateX(${mode === "login" ? "0%" : "100%"})` }} />
          <button style={{ ...s.tabBtn, color: mode === "login" ? "#fff" : "#64748b" }} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
          <button style={{ ...s.tabBtn, color: mode === "register" ? "#fff" : "#64748b" }} onClick={() => { setMode("register"); setError(""); }}>Register</button>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={s.form}>
          {mode === "register" && (
            <Field label="Full name" type="text" placeholder="Your name"
              value={form.name} onChange={update("name")}
              focused={focused === "name"} onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
            />
          )}
          <Field label="Email" type="email" placeholder="you@example.com"
            value={form.email} onChange={update("email")}
            focused={focused === "email"} onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
          />
          <Field label="Password" type="password" placeholder="••••••••"
            value={form.password} onChange={update("password")}
            focused={focused === "password"} onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
          />

          {error && <div style={s.error}><span style={s.errorIcon}>!</span>{error}</div>}

          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading
              ? <span style={s.spinner} />
              : <><span>{mode === "login" ? "Sign in" : "Create account"}</span><span>→</span></>
            }
          </button>
        </form>

        <p style={s.switchText}>
          {mode === "login" ? "New here? " : "Have an account? "}
          <span style={s.switchLink} onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Create account" : "Sign in"}
          </span>
        </p>

        <div style={s.badges}>
          {["🔒 Encrypted", "⚡ Real-time", "📺 HD Video"].map(b => (
            <span key={b} style={s.badge}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConvorkMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" style={{ filter: "drop-shadow(0 2px 6px rgba(108,99,255,0.2))" }}>
      <rect width="32" height="32" rx="9" fill="url(#lg1)" />
      <rect x="5" y="10" width="14" height="12" rx="3" fill="white" opacity="0.9" />
      <polygon points="19,13 27,9 27,23 19,19" fill="white" opacity="0.8" />
      <circle cx="12" cy="16" r="3" fill="url(#lg2)" />
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#6c63ff" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10d9a0" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Field({ label, type, placeholder, value, onChange, focused, onFocus, onBlur }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: focused ? "#6c63ff" : "#64748b", marginBottom: 8, transition: "color 0.2s" }}>{label}</label>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={onChange} onFocus={onFocus} onBlur={onBlur} required
        style={{ width: "100%", padding: "12px 14px", background: "rgba(15,23,42,0.02)", borderWidth: "1px", borderStyle: "solid", borderColor: focused ? "rgba(108,99,255,0.4)" : "rgba(15,23,42,0.1)", borderRadius: 10, color: "#0f172a", fontSize: 14, outline: "none", fontFamily: "inherit", transition: "all 0.2s" }}
      />
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", position: "relative", overflow: "hidden", padding: 20, fontFamily: "'DM Sans', sans-serif" },
  bg: { position: "absolute", inset: 0, pointerEvents: "none" },
  mesh1: { position: "absolute", top: "-20%", left: "-5%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.06) 0%, transparent 65%)" },
  mesh2: { position: "absolute", bottom: "-15%", right: "-5%", width: "45vw", height: "45vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,217,160,0.04) 0%, transparent 65%)" },
  gridBg: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(15,23,42,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" },
  geoBg: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  backLink: { position: "absolute", top: 24, left: 28, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#64748b", textDecoration: "none", zIndex: 10, transition: "color 0.2s", fontFamily: "inherit" },
  card: { position: "relative", zIndex: 1, width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(28px)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.08)", borderRadius: 24, padding: "40px 36px", boxShadow: "0 30px 60px rgba(15,23,42,0.05)" },
  logo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 24 },
  logoText: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "-0.3px", color: "#0f172a" },
  h1: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 26, letterSpacing: "-0.5px", color: "#0f172a", marginBottom: 6 },
  sub: { fontSize: 14, color: "#475569", marginBottom: 24 },
  tabs: { display: "flex", position: "relative", background: "rgba(15,23,42,0.04)", borderRadius: 10, padding: 3, marginBottom: 24, overflow: "hidden" },
  tabSlider: { position: "absolute", top: 3, left: 3, width: "calc(50% - 3px)", height: "calc(100% - 6px)", background: "linear-gradient(135deg, #6c63ff, #a78bfa)", borderRadius: 7, transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 4px 12px rgba(108,99,255,0.2)" },
  tabBtn: { flex: 1, padding: "10px 0", background: "transparent", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", position: "relative", zIndex: 1, fontFamily: "inherit", transition: "color 0.2s" },
  form: { marginBottom: 20 },
  btn: { width: "100%", padding: "13px", borderRadius: 12, background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(108,99,255,0.25)", transition: "all 0.2s", marginTop: 8, fontFamily: "inherit" },
  spinner: { width: 18, height: 18, borderRadius: "50%", borderWidth: "2px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite", display: "inline-block" },
  error: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(255,77,109,0.06)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,77,109,0.2)", borderRadius: 10, color: "#ff4d6d", fontSize: 13, marginBottom: 14 },
  errorIcon: { width: 18, height: 18, borderRadius: "50%", background: "rgba(255,77,109,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 },
  switchText: { textAlign: "center", fontSize: 13, color: "#64748b", marginBottom: 24 },
  switchLink: { color: "#6c63ff", cursor: "pointer", fontWeight: 700 },
  badges: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  badge: { fontSize: 11, fontWeight: 500, color: "#475569", background: "rgba(15,23,42,0.02)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.06)", borderRadius: 99, padding: "5px 12px" },
};