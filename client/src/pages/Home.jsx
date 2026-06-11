import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const STATS = [
  { value: "256-bit", label: "Encryption" },
  { value: "<80ms", label: "Latency" },
  { value: "50MB", label: "File sharing" },
  { value: "∞", label: "Participants" },
];

const FEATURES = [
  {
    icon: "🎥",
    title: "Crystal HD Video",
    desc: "Adaptive 1080p streaming with WebRTC peer-to-peer — zero server relay for your media.",
    color: "#6c63ff",
  },
  {
    icon: "🖥",
    title: "Screen Sharing",
    desc: "Share any window, tab, or full screen with one click. System audio included.",
    color: "#10d9a0",
  },
  {
    icon: "✏️",
    title: "Live Whiteboard",
    desc: "Sketch, annotate, and brainstorm in real-time. Every stroke syncs instantly.",
    color: "#f59e0b",
  },
  {
    icon: "📁",
    title: "File Drop",
    desc: "Drag and drop files directly into your meeting. Encrypted at rest, instant access.",
    color: "#ec4899",
  },
  {
    icon: "💬",
    title: "In-Meeting Chat",
    desc: "Persistent chat with message history. Stay in flow without leaving the call.",
    color: "#3b82f6",
  },
  {
    icon: "🔒",
    title: "End-to-End Security",
    desc: "DTLS-SRTP media encryption. JWT auth. Your data never touches our servers.",
    color: "#a78bfa",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 80);
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const parallax = (factor) => ({
    transform: `translate(${(mousePos.x - window.innerWidth / 2) * factor}px, ${(mousePos.y - window.innerHeight / 2) * factor}px)`,
    transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1)",
  });

  return (
    <div style={s.page}>
      {/* ── GEOMETRIC BACKGROUND ── */}
      <div style={s.bgLayer}>
        {/* Radial mesh (Light Theme Colors) */}
        <div style={s.mesh1} />
        <div style={s.mesh2} />
        <div style={s.mesh3} />

        {/* Animated grid */}
        <div style={s.grid} />

        {/* Floating geometric shapes - Increased opacity for light mode */}
        <svg style={{ ...s.geoSvg, ...parallax(0.008) }} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          {/* Hexagons */}
          <polygon points="120,60 160,38 200,60 200,104 160,126 120,104" fill="none" stroke="rgba(108,99,255,0.4)" strokeWidth="1.5" style={{ animation: "geo-spin 40s linear infinite", transformOrigin: "160px 82px" }} />
          <polygon points="320,140 360,118 400,140 400,184 360,206 320,184" fill="none" stroke="rgba(108,99,255,0.25)" strokeWidth="1" style={{ animation: "geo-spin 55s linear infinite reverse", transformOrigin: "360px 162px" }} />
          <polygon points="1200,80 1260,46 1320,80 1320,148 1260,182 1200,148" fill="none" stroke="rgba(167,139,250,0.35)" strokeWidth="1.5" style={{ animation: "geo-spin 35s linear infinite", transformOrigin: "1260px 114px" }} />
          <polygon points="1050,200 1090,178 1130,200 1130,244 1090,266 1050,244" fill="none" stroke="rgba(16,217,160,0.3)" strokeWidth="1" style={{ animation: "geo-spin 48s linear infinite reverse", transformOrigin: "1090px 222px" }} />

          {/* Circles */}
          <circle cx="80" cy="300" r="60" fill="none" stroke="rgba(108,99,255,0.25)" strokeWidth="1.5" strokeDasharray="8 6" style={{ animation: "geo-spin 25s linear infinite" }} />
          <circle cx="80" cy="300" r="40" fill="none" stroke="rgba(108,99,255,0.3)" strokeWidth="1" />
          <circle cx="1380" cy="250" r="80" fill="none" stroke="rgba(167,139,250,0.25)" strokeWidth="1.5" strokeDasharray="12 8" style={{ animation: "geo-spin 30s linear infinite reverse" }} />
          <circle cx="700" cy="50" r="120" fill="none" stroke="rgba(108,99,255,0.15)" strokeWidth="1" strokeDasharray="16 10" style={{ animation: "geo-spin 60s linear infinite" }} />

          {/* Triangles */}
          <polygon points="50,550 100,470 150,550" fill="none" stroke="rgba(16,217,160,0.3)" strokeWidth="1.5" style={{ animation: "geo-float 8s ease-in-out infinite" }} />
          <polygon points="1350,450 1400,370 1440,450" fill="none" stroke="rgba(108,99,255,0.3)" strokeWidth="1.5" style={{ animation: "geo-float 10s ease-in-out infinite reverse" }} />
          <polygon points="600,820 650,740 700,820" fill="none" stroke="rgba(245,158,11,0.25)" strokeWidth="1.5" style={{ animation: "geo-float 12s ease-in-out infinite" }} />

          {/* Diamond */}
          <polygon points="1300,600 1340,560 1380,600 1340,640" fill="none" stroke="rgba(236,72,153,0.3)" strokeWidth="1.5" style={{ animation: "geo-float 9s ease-in-out infinite reverse" }} />
          <polygon points="140,750 180,710 220,750 180,790" fill="none" stroke="rgba(167,139,250,0.25)" strokeWidth="1.5" style={{ animation: "geo-float 11s ease-in-out infinite" }} />

          {/* Cross/plus shapes */}
          <g style={{ animation: "geo-spin 20s linear infinite", transformOrigin: "1100px 700px" }}>
            <line x1="1080" y1="700" x2="1120" y2="700" stroke="rgba(108,99,255,0.4)" strokeWidth="2" strokeLinecap="round" />
            <line x1="1100" y1="680" x2="1100" y2="720" stroke="rgba(108,99,255,0.4)" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g style={{ animation: "geo-spin 15s linear infinite reverse", transformOrigin: "300px 700px" }}>
            <line x1="280" y1="700" x2="320" y2="700" stroke="rgba(16,217,160,0.3)" strokeWidth="2" strokeLinecap="round" />
            <line x1="300" y1="680" x2="300" y2="720" stroke="rgba(16,217,160,0.3)" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Dots grid */}
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 12 }, (_, c) => (
              <circle key={`${r}-${c}`}
                cx={60 + c * 120} cy={160 + r * 90}
                r="1.5"
                fill={`rgba(108,99,255,${0.15 + Math.sin(r + c) * 0.05})`}
              />
            ))
          )}

          {/* Signal wave lines */}
          <g opacity="0.15">
            <path d="M 0 600 Q 180 560 360 600 Q 540 640 720 600 Q 900 560 1080 600 Q 1260 640 1440 600" fill="none" stroke="#6c63ff" strokeWidth="1.5" style={{ animation: "wave 8s ease-in-out infinite" }} />
            <path d="M 0 620 Q 180 580 360 620 Q 540 660 720 620 Q 900 580 1080 620 Q 1260 660 1440 620" fill="none" stroke="#a78bfa" strokeWidth="1.5" style={{ animation: "wave 8s ease-in-out infinite 1s" }} />
          </g>
        </svg>

        {/* Small particle dots */}
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            width: i % 3 === 0 ? 4 : 3,
            height: i % 3 === 0 ? 4 : 3,
            borderRadius: "50%",
            background: i % 4 === 0 ? "rgba(16,217,160,0.6)" : "rgba(108,99,255,0.5)",
            animation: `particle-float ${6 + (i % 6)}s ${(i % 4)}s ease-in-out infinite alternate`,
            pointerEvents: "none",
          }} />
        ))}
      </div>

      {/* ── NAVBAR ── */}
      <nav style={s.nav}>
        <div style={s.navBrand}>
          <div style={s.navLogo}>
            <ConvorkIcon />
          </div>
          <span style={s.navName}>Convork</span>
        </div>
        <div style={s.navLinks}>
          <a style={s.navLink} href="#features">Features</a>
          <a style={s.navLink} href="#how">How it works</a>
        </div>
        <div style={s.navActions}>
  {user ? (
    <button style={s.navCta} onClick={() => navigate("/dashboard")}>
      Go to Dashboard →
    </button>
  ) : (
    <>
      <button style={s.navLoginBtn} onClick={() => navigate("/login")}>Sign in</button>
      <button style={s.navCta} onClick={() => navigate("/login")}>
        Get started free →
      </button>
    </>
  )}
</div>
      </nav>

      {/* ── HERO (Centered & Stacked) ── */}
      <section ref={heroRef} style={s.hero}>
        <div style={{ ...s.heroInner, opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(30px)", transition: "all 0.9s cubic-bezier(0.16,1,0.3,1)" }}>

          {/* Eyebrow badge */}
          <div style={s.eyebrow}>
            <span style={s.eyebrowDot} />
            <span>WebRTC · End-to-end encrypted · Zero install</span>
          </div>

          {/* Headline */}
          <h1 style={s.h1}>
            Where teams<br />
            <span style={s.h1Grad}>meet, build,</span> and ship.
          </h1>

          <p style={s.heroDesc}>
            Convork is a blazing-fast video workspace — HD calls, shared whiteboards,
            file drops, and live chat. No downloads. No limits.
          </p>

          {/* CTA buttons */}
          <div style={s.ctaRow}>
  <button style={s.ctaPrimary} onClick={() => navigate(user ? "/dashboard" : "/login")}>
    <span>{user ? "Go to dashboard" : "Start a meeting"}</span>
    <span style={s.ctaArrow}>{user ? "→" : "🎥"}</span>
  </button>
  <button style={s.ctaSecondary} onClick={() => navigate(user ? "/dashboard" : "/login")}>
    {user ? "Open workspace →" : "Join with code →"}
  </button>
</div>

          {/* Stats */}
          <div style={s.stats}>
            {STATS.map((stat, i) => (
              <div key={stat.label} style={{ ...s.stat, animationDelay: `${0.6 + i * 0.1}s` }}>
                <div style={s.statValue}>{stat.value}</div>
                <div style={s.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual — mock video grid (Moved below text) */}
        <div style={{ ...s.heroVisual, opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(40px) scale(0.96)", transition: "all 1.1s cubic-bezier(0.16,1,0.3,1) 0.4s" }}>
          <MockMeetingUI mousePos={mousePos} />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={s.section}>
        <div style={s.sectionHead}>
          <div style={s.sectionEyebrow}>Everything you need</div>
          <h2 style={s.sectionH2}>Built for serious collaboration</h2>
          <p style={s.sectionSub}>Every tool your team needs, deeply integrated.</p>
        </div>
        <div style={s.featureGrid}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={s.section}>
        <div style={s.sectionHead}>
          <div style={s.sectionEyebrow}>Simple by design</div>
          <h2 style={s.sectionH2}>Up in 3 steps</h2>
        </div>
        <div style={s.stepsRow}>
          {[
            { n: "01", title: "Create account", desc: "Sign up in 10 seconds. No credit card, no download." },
            { n: "02", title: "Start or join", desc: "Create a new room or paste a code to jump right in." },
            { n: "03", title: "Collaborate", desc: "Video, chat, whiteboard, files — all in one room." },
          ].map((step, i) => (
            <div key={step.n} style={s.step}>
              <div style={s.stepNum}>{step.n}</div>
              {i < 2 && <div style={s.stepLine} />}
              <div style={s.stepTitle}>{step.title}</div>
              <div style={s.stepDesc}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={s.bottomCta}>
        <div style={s.bottomGlow} />
        <div style={s.bottomInner}>
          <h2 style={s.bottomH2}>Ready to Convork?</h2>
          <p style={s.bottomSub}>Join for free. No setup. No limits.</p>
          <button style={s.ctaPrimary} onClick={() => navigate(user ? "/dashboard" : "/login")}>
  <span>{user ? "Go to dashboard" : "Create free account"}</span>
  <span style={s.ctaArrow}>→</span>
</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <div style={s.footerBrand}>
          <ConvorkIcon size={18} />
          <span style={s.footerName}>Convork</span>
        </div>
        <div style={s.footerNote}>© 2025 Convork · Encrypted · Open</div>
      </footer>

      <style>{`
        @keyframes geo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes geo-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-18px); }
        }
        @keyframes wave {
          0%, 100% { d: path("M 0 600 Q 180 560 360 600 Q 540 640 720 600 Q 900 560 1080 600 Q 1260 640 1440 600"); }
          50%       { d: path("M 0 620 Q 180 660 360 620 Q 540 580 720 620 Q 900 660 1080 620 Q 1260 580 1440 620"); }
        }
        @keyframes particle-float {
          from { transform: translateY(0px) scale(1); opacity: 0.6; }
          to   { transform: translateY(-24px) scale(1.3); opacity: 1; }
        }
        @keyframes speaking-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,217,160,0.5); }
          50%       { box-shadow: 0 0 0 5px rgba(16,217,160,0); }
        }
        @keyframes slide-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .feature-card:hover {
          transform: translateY(-6px) !important;
          border-color: rgba(108,99,255,0.2) !important;
          background: #ffffff !important;
          box-shadow: 0 12px 40px rgba(108,99,255,0.08) !important;
        }
        .nav-link:hover { color: #0f172a !important; }
        .cta-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(108,99,255,0.4) !important; }
        .cta-secondary:hover { border-color: rgba(15,23,42,0.2) !important; background: rgba(15,23,42,0.05) !important; color: #0f172a !important; }
      `}</style>
    </div>
  );
}

// ── Convork Logo Icon ──────────────────────────────────────────────────────────
function ConvorkIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="url(#cg)" />
      <rect x="5" y="10" width="14" height="12" rx="3" fill="white" opacity="0.9" />
      <polygon points="19,13 27,9 27,23 19,19" fill="white" opacity="0.8" />
      <circle cx="12" cy="16" r="3" fill="url(#cg2)" />
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#6c63ff" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="cg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10d9a0" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Mock Meeting UI (Light glassmorphism theme) ────────────────────────────────
function MockMeetingUI({ mousePos }) {
  const parallax = (f) => ({
    transform: `translate(${(mousePos.x - (typeof window !== "undefined" ? window.innerWidth : 720) / 2) * f}px, ${(mousePos.y - (typeof window !== "undefined" ? window.innerHeight : 400) / 2) * f}px)`,
    transition: "transform 0.8s cubic-bezier(0.16,1,0.3,1)",
  });

  const PARTICIPANTS = [
    { initials: "JD", color: "#6c63ff", name: "Jason D.", speaking: true },
    { initials: "SR", color: "#10d9a0", name: "Sarah R.", speaking: false },
    { initials: "MK", color: "#f59e0b", name: "Mihail K.", speaking: false },
    { initials: "AL", color: "#ec4899", name: "Aiko L.", speaking: false },
  ];

  return (
    <div style={mv.wrap} {...parallax(0.004)}>
      {/* Window chrome */}
      <div style={mv.chrome}>
        <div style={mv.chromeDots}>
          <div style={{ ...mv.dot, background: "#ff5f57" }} />
          <div style={{ ...mv.dot, background: "#ffbd2e" }} />
          <div style={{ ...mv.dot, background: "#28c840" }} />
        </div>
        <div style={mv.chromeTitle}>
          <div style={mv.chromeLive} />
          <span>Convork · Design Review</span>
        </div>
        <div style={mv.chromeTimer}>24:11</div>
      </div>

      {/* Video grid */}
      <div style={mv.grid}>
        {PARTICIPANTS.map((p, i) => (
          <div key={p.initials} style={{ ...mv.tile, ...(p.speaking ? mv.tileSpeaking : {}), animationDelay: `${i * 0.1}s` }}>
            <div style={{ ...mv.tileAvatar, background: `linear-gradient(135deg, ${p.color}, ${p.color}aa)` }}>
              {p.initials}
            </div>
            <div style={mv.tileName}>
              {p.speaking && <div style={mv.speakDot} />}
              {p.name}
            </div>
            {p.speaking && <div style={mv.speakRing} />}
          </div>
        ))}
      </div>

      {/* Controls strip */}
      <div style={mv.controls}>
        {["🎙", "📷", "🖥", "✏️", "💬"].map((icon, i) => (
          <div key={i} style={{ ...mv.ctrlBtn, ...(i === 0 ? mv.ctrlBtnDanger : {}) }}>
            {icon}
          </div>
        ))}
        <div style={mv.endBtn}>End ✕</div>
      </div>

      {/* Floating chat bubble */}
      <div style={mv.chatBubble}>
        <div style={mv.chatAvatar}>SR</div>
        <div style={mv.chatMsg}>
          <div style={mv.chatName}>Sarah R.</div>
          <div style={mv.chatText}>Can everyone see the mockup? 👀</div>
        </div>
      </div>

      {/* Floating reaction */}
      <div style={mv.reaction}>🎉</div>

      {/* Glow */}
      <div style={mv.glow} />
    </div>
  );
}

function FeatureCard({ feature, index }) {
  return (
    <div className="feature-card" style={{
      ...s.featureCard,
      animationDelay: `${index * 0.08}s`,
      transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{ ...s.featureIconWrap, background: `${feature.color}15`, borderColor: `${feature.color}30` }}>
        <span style={s.featureIcon}>{feature.icon}</span>
        <div style={{ ...s.featureIconGlow, background: feature.color }} />
      </div>
      <h3 style={s.featureTitle}>{feature.title}</h3>
      <p style={s.featureDesc}>{feature.desc}</p>
      <div style={{ ...s.featureAccent, background: feature.color }} />
    </div>
  );
}

// ── Styles (Updated for Light Theme & Centered Layout) ──────────────────────
const s = {
  page: { minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden", overflowY: "auto" },

  // Background
  bgLayer: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" },
  mesh1: { position: "absolute", top: "-20%", left: "-5%", width: "60vw", height: "60vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.06) 0%, transparent 65%)" },
  mesh2: { position: "absolute", top: "30%", right: "-10%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,217,160,0.04) 0%, transparent 65%)" },
  mesh3: { position: "absolute", bottom: "-10%", left: "30%", width: "40vw", height: "40vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 65%)" },
  grid: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(15,23,42,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" },
  geoSvg: { position: "absolute", inset: 0, width: "100%", height: "100%" },

  // Nav
  nav: { position: "relative", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 68, borderBottom: "1px solid rgba(15,23,42,0.06)", backdropFilter: "blur(16px)", background: "rgba(248,250,252,0.75)", flexShrink: 0 },
  navBrand: { display: "flex", alignItems: "center", gap: 10 },
  navLogo: { display: "flex", alignItems: "center", filter: "drop-shadow(0 4px 6px rgba(108,99,255,0.2))" },
  navName: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px", color: "#0f172a" },
  navLinks: { display: "flex", gap: 32 },
  navLink: { color: "#64748b", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.2s", cursor: "pointer" },
  navActions: { display: "flex", gap: 10, alignItems: "center" },
  navLoginBtn: { background: "transparent", border: "1px solid rgba(15,23,42,0.1)", borderRadius: 9, padding: "8px 18px", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" },
  navCta: { background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none", borderRadius: 9, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(108,99,255,0.25)", transition: "all 0.2s" },

  // Hero - Centered and Stacked
  hero: { position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 60, maxWidth: 2000, margin: "0 auto", padding: "100px 48px", minHeight: "calc(100vh - 68px)" },
  heroInner: { width: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
  eyebrow: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, letterSpacing: "0.07em", color: "#6c63ff", background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.15)", borderRadius: 99, padding: "6px 16px", marginBottom: 24 },
  eyebrowDot: { width: 7, height: 7, borderRadius: "50%", background: "#10d9a0", boxShadow: "0 0 8px rgba(16,217,160,0.5)", animation: "speaking-pulse 2s infinite" },
  h1: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 64, lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 24, color: "#0f172a" },
  h1Grad: { background: "linear-gradient(135deg, #6c63ff 0%, #a78bfa 50%, #10d9a0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
  heroDesc: { fontSize: 18, color: "#475569", lineHeight: 1.65, marginBottom: 40, maxWidth: 540, marginInline: "auto" },
  ctaRow: { display: "flex", justifyContent: "center", gap: 16, marginBottom: 56 },
  ctaPrimary: { display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none", borderRadius: 12, padding: "14px 28px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 20px rgba(108,99,255,0.3)", transition: "all 0.25s" },
  ctaSecondary: { display: "flex", alignItems: "center", background: "rgba(15,23,42,0.02)", border: "1px solid rgba(15,23,42,0.1)", borderRadius: 12, padding: "14px 24px", color: "#475569", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" },
  ctaArrow: { fontSize: 17 },
  stats: { display: "flex", justifyContent: "center", gap: 58 },
  stat: { animation: "slide-in-up 0.5s both" },
  statValue: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.5px", background: "linear-gradient(135deg, #6c63ff, #10d9a0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  statLabel: { fontSize: 13, color: "#64748b", fontWeight: 500, marginTop: 4 },

  // Hero visual (Moved Below)
  heroVisual: { width: "100%", display: "flex", justifyContent: "center", alignItems: "center" },

  // Features - More spacious
  section: { position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto", padding: "120px 48px" },
  sectionHead: { textAlign: "center", marginBottom: 64 },
  sectionEyebrow: { display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6c63ff", background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.15)", borderRadius: 99, padding: "5px 16px", marginBottom: 16 },
  sectionH2: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 40, letterSpacing: "-1px", color: "#0f172a", marginBottom: 16 },
  sectionSub: { fontSize: 17, color: "#475569" },
  featureGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 },
  featureCard: { position: "relative", padding: "32px 28px", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(15,23,42,0.06)", borderRadius: 16, overflow: "hidden", cursor: "default", animation: "slide-in-up 0.4s both", backdropFilter: "blur(10px)" },
  featureIconWrap: { width: 52, height: 52, borderRadius: 14, border: "1px solid", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, position: "relative", overflow: "hidden" },
  featureIcon: { fontSize: 24, position: "relative", zIndex: 1 },
  featureIconGlow: { position: "absolute", inset: 0, opacity: 0.1, borderRadius: "inherit" },
  featureTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: "#0f172a", marginBottom: 10 },
  featureDesc: { fontSize: 14, color: "#475569", lineHeight: 1.6 },
  featureAccent: { position: "absolute", bottom: 0, left: 0, width: "100%", height: 3, opacity: 0.6 },

  // Steps
  stepsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, position: "relative" },
  step: { padding: "32px", textAlign: "center", position: "relative" },
  stepNum: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 56, color: "rgba(108,99,255,0.1)", marginBottom: 16, letterSpacing: "-2px" },
  stepLine: { position: "absolute", top: 60, right: "-10%", width: "40%", height: 2, background: "linear-gradient(90deg, rgba(108,99,255,0.15), transparent)" },
  stepTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: "#0f172a", marginBottom: 12 },
  stepDesc: { fontSize: 15, color: "#475569", lineHeight: 1.6 },

  // Bottom CTA
  bottomCta: { position: "relative", zIndex: 1, padding: "120px 48px", textAlign: "center", overflow: "hidden" },
  bottomGlow: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(108,99,255,0.08) 0%, transparent 70%)", pointerEvents: "none" },
  bottomInner: { position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 },
  bottomH2: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 48, letterSpacing: "-1.5px", color: "#0f172a" },
  bottomSub: { fontSize: 18, color: "#475569", marginBottom: 12 },

  // Footer
  footer: { position: "relative", zIndex: 1, borderTop: "1px solid rgba(15,23,42,0.06)", padding: "32px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  footerBrand: { display: "flex", alignItems: "center", gap: 10 },
  footerName: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#0f172a" },
  footerNote: { fontSize: 13, color: "#64748b" },
};

// Mock meeting styles (Adapted for lighter aesthetic)
const mv = {
  wrap: { position: "relative", width: 600, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(24px)", border: "1px solid rgba(15,23,42,0.1)", borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px rgba(15,23,42,0.08), 0 0 0 1px rgba(255,255,255,0.6)" },
  chrome: { display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(15,23,42,0.06)", gap: 12, background: "rgba(248,250,252,0.9)" },
  chromeDots: { display: "flex", gap: 6 },
  dot: { width: 11, height: 11, borderRadius: "50%" },
  chromeTitle: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#475569" },
  chromeLive: { width: 7, height: 7, borderRadius: "50%", background: "#10d9a0", boxShadow: "0 0 8px rgba(16,217,160,0.6)" },
  chromeTimer: { fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 12 },
  tile: { position: "relative", background: "linear-gradient(135deg, #f8fafc, #e2e8f0)", borderRadius: 12, height: 150, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(15,23,42,0.06)", overflow: "hidden", animation: "slide-in-up 0.4s both" },
  tileSpeaking: { border: "1.5px solid rgba(16,217,160,0.6)", boxShadow: "0 0 20px rgba(16,217,160,0.15)", animation: "speaking-pulse 2s infinite" },
  tileAvatar: { width: 52, height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif", boxShadow: "0 8px 24px rgba(15,23,42,0.12)" },
  tileName: { position: "absolute", bottom: 10, left: 10, display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#0f172a", background: "rgba(255,255,255,0.9)", borderRadius: 6, padding: "4px 10px", backdropFilter: "blur(6px)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  speakDot: { width: 6, height: 6, borderRadius: "50%", background: "#10d9a0", flexShrink: 0 },
  speakRing: { position: "absolute", inset: 0, border: "2px solid rgba(16,217,160,0.4)", borderRadius: 12, animation: "speaking-pulse 1.5s infinite" },
  controls: { display: "flex", alignItems: "center", gap: 8, padding: "14px", background: "rgba(248,250,252,0.95)", borderTop: "1px solid rgba(15,23,42,0.05)", justifyContent: "center" },
  ctrlBtn: { width: 36, height: 36, borderRadius: 10, background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#0f172a" },
  ctrlBtnDanger: { background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.2)" },
  endBtn: { marginLeft: 12, background: "rgba(255,77,109,0.95)", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#fff", border: "none", boxShadow: "0 4px 12px rgba(255,77,109,0.2)" },
  chatBubble: { position: "absolute", top: 60, right: -20, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 14, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start", boxShadow: "0 12px 40px rgba(15,23,42,0.08)", width: 220, animation: "slide-in-up 0.5s 0.8s both" },
  chatAvatar: { width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #10d9a0, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 },
  chatName: { fontSize: 11, fontWeight: 700, color: "#0f172a", marginBottom: 3 },
  chatText: { fontSize: 12, color: "#475569", lineHeight: 1.4 },
  reaction: { position: "absolute", top: 180, left: 30, fontSize: 28, animation: "geo-float 3s ease-in-out infinite 1s" },
  glow: { position: "absolute", bottom: -40, left: "50%", transform: "translateX(-50%)", width: 400, height: 100, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(108,99,255,0.1) 0%, transparent 70%)", pointerEvents: "none" },
};