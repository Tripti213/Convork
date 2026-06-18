import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function MyNotes() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch("/api/notes/all", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setNotes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const deleteNote = async (noteId) => {
    if (!confirm("Delete this note? This can't be undone.")) return;
    try {
      await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (selected?.id === noteId) setSelected(null);
    } catch {}
  };

  const filtered = notes.filter(n =>
    n.roomName.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div style={s.page}>
      {/* ── Geometric background (Light Theme) ── */}
      <div style={s.bg}>
        <div style={s.mesh1} />
        <div style={s.mesh2} />
        <div style={s.gridBg} />
        
        {/* Floating geometric SVG shapes */}
        <svg style={s.geoBg} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          {/* Hexagons */}
          <polygon points="120,60 160,38 200,60 200,104 160,126 120,104" fill="none" stroke="rgba(108,99,255,0.25)" strokeWidth="1.5" style={{ animation: "geo-spin 40s linear infinite", transformOrigin: "160px 82px" }} />
          <polygon points="1260,80 1310,52 1360,80 1360,136 1310,164 1260,136" fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="1.5" style={{ animation: "geo-spin 36s linear infinite reverse", transformOrigin: "1310px 108px" }} />
          
          {/* Circles */}
          <circle cx="40" cy="500" r="80" fill="none" stroke="rgba(108,99,255,0.15)" strokeWidth="1" strokeDasharray="10 7" style={{ animation: "geo-spin 30s linear infinite" }} />
          <circle cx="1420" cy="400" r="100" fill="none" stroke="rgba(167,139,250,0.15)" strokeWidth="1" strokeDasharray="12 8" style={{ animation: "geo-spin 35s linear infinite reverse" }} />
          
          {/* Triangles */}
          <polygon points="60,750 110,670 160,750" fill="none" stroke="rgba(16,217,160,0.25)" strokeWidth="1.5" style={{ animation: "geo-float 9s ease-in-out infinite" }} />
          <polygon points="1300,720 1350,640 1400,720" fill="none" stroke="rgba(108,99,255,0.2)" strokeWidth="1.5" style={{ animation: "geo-float 11s ease-in-out infinite reverse" }} />
          
          {/* Cross marks */}
          <g style={{ animation: "geo-spin 18s linear infinite", transformOrigin: "1100px 750px" }}>
            <line x1="1082" y1="750" x2="1118" y2="750" stroke="rgba(108,99,255,0.3)" strokeWidth="2" strokeLinecap="round" />
            <line x1="1100" y1="732" x2="1100" y2="768" stroke="rgba(108,99,255,0.3)" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g style={{ animation: "geo-spin 14s linear infinite reverse", transformOrigin: "340px 150px" }}>
            <line x1="322" y1="150" x2="358" y2="150" stroke="rgba(16,217,160,0.2)" strokeWidth="2" strokeLinecap="round" />
            <line x1="340" y1="132" x2="340" y2="168" stroke="rgba(16,217,160,0.2)" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Dot grid */}
          {Array.from({ length: 6 }, (_, r) => Array.from({ length: 10 }, (_, c) => (
            <circle key={`dot-${r}-${c}`} cx={100 + c * 130} cy={150 + r * 120} r="1.5" fill={`rgba(108,99,255,${0.1 + (Math.sin(r + c) * 0.03)})`} />
          )))}

          {/* Wave lines */}
          <path d="M 0 880 Q 360 850 720 880 Q 1080 910 1440 880" fill="none" stroke="rgba(108,99,255,0.15)" strokeWidth="1.5" style={{ animation: "wave 8s ease-in-out infinite" }} />
        </svg>

        {/* Particles */}
        {Array.from({ length: 18 }, (_, i) => (
          <div key={`part-${i}`} style={{ position: "absolute", left: `${(i * 43 + 8) % 100}%`, top: `${(i * 71 + 5) % 100}%`, width: i % 4 === 0 ? 4 : 3, height: i % 4 === 0 ? 4 : 3, borderRadius: "50%", background: i % 3 === 0 ? "rgba(16,217,160,0.5)" : "rgba(108,99,255,0.4)", animation: `particle-float ${5 + i % 5}s ${i % 3 * 0.9}s ease-in-out infinite alternate`, pointerEvents: "none" }} />
        ))}
      </div>

      <nav style={s.nav}>
        <div style={s.navBrand} onClick={() => navigate("/dashboard")}>
          <span style={s.backArrow}>←</span>
          <span style={s.navName}>My Notes</span>
        </div>
      </nav>

      <div style={s.content}>
        <div style={s.searchBar}>
          <span style={s.searchIcon}>🔍</span>
          <input
            style={s.searchInput}
            placeholder="Search notes by meeting name or content…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={s.loadingState}><div style={s.spinner} /></div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>📝</div>
            <div style={s.emptyTitle}>
              {notes.length === 0 ? "No notes yet" : "No matching notes"}
            </div>
            <div style={s.emptySub}>
              {notes.length === 0
                ? "Notes you take during meetings will show up here"
                : "Try a different search term"}
            </div>
          </div>
        ) : (
          <div style={s.layout}>
            <div style={s.list}>
              {filtered.map(note => (
                <div
                  key={note.id}
                  style={{ ...s.noteCard, ...(selected?.id === note.id ? s.noteCardActive : {}) }}
                  onClick={() => setSelected(note)}
                >
                  <div style={s.noteCardHeader}>
                    <span style={s.noteRoomName}>{note.roomName}</span>
                    <span style={s.noteDate}>{formatDate(note.updatedAt)}</span>
                  </div>
                  <div style={s.notePreview}>
                    {note.content.slice(0, 100) || "Empty note"}
                  </div>
                </div>
              ))}
            </div>

            <div style={s.detail}>
              {selected ? (
                <>
                  <div style={s.detailHeader}>
                    <div>
                      <div style={s.detailTitle}>{selected.roomName}</div>
                      <div style={s.detailMeta}>
                        Last updated {formatDate(selected.updatedAt)} · Code: {selected.roomCode}
                      </div>
                    </div>
                    <button style={s.deleteBtn} onClick={() => deleteNote(selected.id)}>
                      🗑 Delete
                    </button>
                  </div>
                  <div style={s.detailContent}>{selected.content}</div>
                </>
              ) : (
                <div style={s.noSelection}>Select a note to view its contents</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes geo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes geo-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-15px); }
        }
        @keyframes wave {
          0%, 100% { d: path("M 0 880 Q 360 850 720 880 Q 1080 910 1440 880"); }
          50%      { d: path("M 0 890 Q 360 920 720 890 Q 1080 860 1440 890"); }
        }
        @keyframes particle-float {
          from { transform: translateY(0px) scale(1); opacity: 0.5; }
          to   { transform: translateY(-20px) scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Styles (Updated for Light Slate Theme) ──────────────────────────────────
const s = {
  page: { minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "'DM Sans', sans-serif", position: "relative", overflowX: "hidden" },
  bg: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 },
  mesh1: { position: "absolute", top: "-10%", left: "-5%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.06) 0%, transparent 65%)" },
  mesh2: { position: "absolute", bottom: "-10%", right: "-5%", width: "40vw", height: "40vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,217,160,0.04) 0%, transparent 65%)" },
  gridBg: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(15,23,42,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.02) 1px, transparent 1px)", backgroundSize: "64px 64px" },
  geoBg: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  
  nav: { position: "relative", zIndex: 10, display: "flex", alignItems: "center", padding: "0 32px", height: 62, borderBottom: "1px solid rgba(15,23,42,0.06)", backdropFilter: "blur(16px)", background: "rgba(248,250,252,0.8)" },
  navBrand: { display: "flex", alignItems: "center", gap: 12, cursor: "pointer" },
  backArrow: { fontSize: 18, color: "#64748b", transition: "color 0.2s" },
  navName: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: "#0f172a" },
  
  content: { position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "40px 24px" },
  searchBar: { display: "flex", alignItems: "center", gap: 10, background: "rgba(15,23,42,0.02)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.08)", borderRadius: 12, padding: "12px 18px", marginBottom: 32, transition: "border-color 0.2s" },
  searchIcon: { fontSize: 14, opacity: 0.6 },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#0f172a", fontSize: 14, fontFamily: "inherit" },
  
  layout: { display: "grid", gridTemplateColumns: "360px 1fr", gap: 24 },
  list: { display: "flex", flexDirection: "column", gap: 10, maxHeight: "70vh", overflowY: "auto", paddingRight: 4 },
  noteCard: { padding: "16px 18px", background: "rgba(255,255,255,0.6)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.06)", borderRadius: 14, cursor: "pointer", transition: "all 0.2s", backdropFilter: "blur(10px)", boxShadow: "0 4px 12px rgba(15,23,42,0.02)" },
  noteCardActive: { background: "rgba(108,99,255,0.04)", borderColor: "rgba(108,99,255,0.3)", boxShadow: "0 4px 12px rgba(108,99,255,0.05)" },
  noteCardHeader: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  noteRoomName: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  noteDate: { fontSize: 11, color: "#64748b", fontWeight: 500 },
  notePreview: { fontSize: 13, color: "#475569", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  
  detail: { background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.08)", borderRadius: 20, padding: 32, minHeight: 500, boxShadow: "0 20px 60px rgba(15,23,42,0.04)" },
  detailHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid rgba(15,23,42,0.06)" },
  detailTitle: { fontSize: 22, fontWeight: 800, fontFamily: "'Syne', sans-serif", marginBottom: 6, color: "#0f172a" },
  detailMeta: { fontSize: 13, color: "#64748b", fontWeight: 500 },
  deleteBtn: { padding: "8px 16px", background: "rgba(255,77,109,0.08)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,77,109,0.2)", borderRadius: 10, color: "#ff4d6d", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" },
  detailContent: { fontSize: 15, lineHeight: 1.8, color: "#475569", whiteSpace: "pre-wrap" },
  
  noSelection: { display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#94a3b8", fontSize: 15, fontWeight: 500 },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "100px 0", gap: 10 },
  emptyIcon: { fontSize: 48, opacity: 0.45, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: "#0f172a" },
  emptySub: { fontSize: 14, color: "#64748b" },
  
  loadingState: { display: "flex", justifyContent: "center", padding: "100px 0" },
  spinner: { width: 32, height: 32, borderRadius: "50%", borderWidth: "3px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.1)", borderTopColor: "#6c63ff", animation: "spin 0.7s linear infinite" },
};