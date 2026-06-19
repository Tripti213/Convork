import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";

// Generates a consistent accent color based on the room name
function getCardTheme(str) {
  const themes = [
    { main: "#6c63ff", bg: "rgba(108,99,255,0.08)", text: "#5b54d6" }, // Purple
    { main: "#10d9a0", bg: "rgba(16,217,160,0.08)", text: "#0d9a72" }, // Green
    { main: "#f59e0b", bg: "rgba(245,158,11,0.08)", text: "#c27d08" }, // Orange
    { main: "#ec4899", bg: "rgba(236,72,153,0.08)", text: "#bd3a7a" }, // Pink
    { main: "#3b82f6", bg: "rgba(59,130,246,0.08)", text: "#2c62c2" }, // Blue
  ];
  let hash = 0;
  if (!str) return themes[0];
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return themes[Math.abs(hash) % themes.length];
}

export default function MyNotes() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [hoveredNote, setHoveredNote] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || "";
  }

  useEffect(() => {
    fetch(apiUrl("/api/notes/all"), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setNotes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const deleteNote = async (noteId) => {
    if (!confirm("Delete this note? This can't be undone.")) return;
    try {
      await fetch(apiUrl(`/api/notes/${noteId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (selected?.id === noteId) setSelected(null);
    } catch { }
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

  // Determine the theme of the currently selected note for the right panel
  const selectedTheme = selected ? getCardTheme(selected.roomName) : null;

  return (
    <div style={s.page}>
      {/* ── Geometric background ── */}
      <div style={s.bg}>
        <div style={s.mesh1} />
        <div style={s.mesh2} />
        <div style={s.gridBg} />
        <svg style={s.geoBg} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <polygon points="120,60 160,38 200,60 200,104 160,126 120,104" fill="none" stroke="rgba(108,99,255,0.2)" strokeWidth="1.5" style={{ animation: "geo-spin 40s linear infinite", transformOrigin: "160px 82px" }} />
          <polygon points="1260,80 1310,52 1360,80 1360,136 1310,164 1260,136" fill="none" stroke="rgba(167,139,250,0.15)" strokeWidth="1.5" style={{ animation: "geo-spin 36s linear infinite reverse", transformOrigin: "1310px 108px" }} />
          <circle cx="40" cy="500" r="80" fill="none" stroke="rgba(108,99,255,0.1)" strokeWidth="1" strokeDasharray="10 7" style={{ animation: "geo-spin 30s linear infinite" }} />
          <circle cx="1420" cy="400" r="100" fill="none" stroke="rgba(167,139,250,0.1)" strokeWidth="1" strokeDasharray="12 8" style={{ animation: "geo-spin 35s linear infinite reverse" }} />
          <g style={{ animation: "geo-spin 18s linear infinite", transformOrigin: "1100px 750px" }}>
            <line x1="1082" y1="750" x2="1118" y2="750" stroke="rgba(108,99,255,0.2)" strokeWidth="2" strokeLinecap="round" />
            <line x1="1100" y1="732" x2="1100" y2="768" stroke="rgba(108,99,255,0.2)" strokeWidth="2" strokeLinecap="round" />
          </g>
          {Array.from({ length: 6 }, (_, r) => Array.from({ length: 10 }, (_, c) => (
            <circle key={`dot-${r}-${c}`} cx={100 + c * 130} cy={150 + r * 120} r="1.5" fill={`rgba(108,99,255,${0.08 + (Math.sin(r + c) * 0.02)})`} />
          )))}
        </svg>
      </div>

      {/* ── Top Navigation ── */}
      <nav style={s.nav}>
        <div style={s.navBrand} onClick={() => navigate("/dashboard")}>
          <span style={s.backArrow}>←</span>
          <span style={s.navName}>Workspace</span>
        </div>
        <div style={s.navTitle}>My Notes</div>
      </nav>

      <div style={s.content}>
        
        {/* ── Search Bar ── */}
        <div style={{ ...s.searchBar, ...(searchFocused ? s.searchBarFocused : {}) }}>
          <span style={{ ...s.searchIcon, color: searchFocused ? "#6c63ff" : "#94a3b8" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            style={s.searchInput}
            placeholder="Search notes by meeting name or content…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>

        {/* ── Main Content Area ── */}
        {loading ? (
          <div style={s.loadingState}><div style={s.spinner} /></div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>📝</div>
            <div style={s.emptyTitle}>
              {notes.length === 0 ? "Your notes are empty" : "No matching notes found"}
            </div>
            <div style={s.emptySub}>
              {notes.length === 0
                ? "Notes saved during your Convork meetings will securely appear here."
                : "Try adjusting your search terms."}
            </div>
          </div>
        ) : (
          <div style={s.layout}>
            
            {/* Left: Notes List */}
            <div className="hide-scroll" style={s.list}>
              {filtered.map((note, i) => {
                const isActive = selected?.id === note.id;
                const isHovered = hoveredNote === note.id;
                const theme = getCardTheme(note.roomName);
                
                return (
                  <div
                    key={note.id}
                    style={{ 
                      ...s.noteCard, 
                      ...(isHovered ? s.noteCardHover : {}),
                      ...(isActive ? s.noteCardActive : {}),
                      borderTop: `4px solid ${theme.main}`,
                      // Fix: Dynamically color the border based on hover/active state
                      borderColor: (isActive || isHovered) ? theme.main : "rgba(15,23,42,0.06)",
                      animationDelay: `${i * 0.05}s` 
                    }}
                    onMouseEnter={() => setHoveredNote(note.id)}
                    onMouseLeave={() => setHoveredNote(null)}
                    onClick={() => setSelected(note)}
                  >
                    <div style={s.noteCardHeader}>
                      {/* Fix: Dynamically color the text based on hover/active state */}
                      <span style={{ ...s.noteRoomName, color: (isActive || isHovered) ? theme.text : "#0f172a" }}>
                        {note.roomName}
                      </span>
                    </div>
                    
                    <div style={s.notePreview}>
                      {stripHtml(note.content) || "Empty note..."}
                    </div>

                    <div style={s.noteFooter}>
                      <span style={{ ...s.noteDate, background: isActive ? theme.bg : "rgba(15,23,42,0.03)", color: isActive ? theme.text : "#64748b" }}>
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Note Detail View */}
            <div style={s.detailWrapper}>
              {selected ? (
                // Re-renders animation when selecting a new note
                <div key={selected.id} style={s.detail}>
                  
                  {/* Creative Header Banner */}
                  <div style={{ ...s.detailHeaderBanner, background: selectedTheme.bg }}>
                    <div>
                      <div style={s.detailTitle}>{selected.roomName}</div>
                      <div style={s.detailMeta}>
                        <span style={{ ...s.detailDatePill, color: selectedTheme.text }}>
                          {formatDate(selected.updatedAt)}
                        </span>
                        <span style={s.dotDivider}>•</span> 
                        <span style={{ color: selectedTheme.text, fontWeight: 600 }}>Code:</span> 
                        <span style={s.codePill}>{selected.roomCode}</span>
                      </div>
                    </div>
                    
                    <button style={s.deleteBtn} onClick={() => deleteNote(selected.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Delete
                    </button>
                  </div>
                  
                  {/* Document-style content area */}
                  <div style={{ ...s.detailContentWrapper, borderLeftColor: selectedTheme.main }}>
                    <div
                      style={s.detailContent}
                      dangerouslySetInnerHTML={{ __html: selected.content }}
                    />
                  </div>
                </div>
              ) : (
                <div style={s.noSelection}>
                  <div style={s.noSelIcon}>✨</div>
                  Select a note from the list to view its contents
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Global CSS & Animations */}
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes geo-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slide-up-fade {
          from { opacity: 0; transform: translateY(15px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Clean & Creative Styles (Light Slate Theme) ─────────────────────────────
const s = {
  page: { minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "'DM Sans', sans-serif", position: "relative", overflowX: "hidden" },
  bg: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 },
  mesh1: { position: "absolute", top: "-10%", left: "-5%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.04) 0%, transparent 65%)" },
  mesh2: { position: "absolute", bottom: "-10%", right: "-5%", width: "40vw", height: "40vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,217,160,0.03) 0%, transparent 65%)" },
  gridBg: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(15,23,42,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.02) 1px, transparent 1px)", backgroundSize: "64px 64px" },
  geoBg: { position: "absolute", inset: 0, width: "100%", height: "100%" },

  nav: { position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", height: 68, borderBottom: "1px solid rgba(15,23,42,0.06)", backdropFilter: "blur(16px)", background: "rgba(248,250,252,0.85)" },
  navBrand: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "6px 12px", marginLeft: -12, borderRadius: 12, transition: "background 0.2s" },
  backArrow: { fontSize: 18, color: "#64748b" },
  navName: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#475569" },
  navTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "#0f172a", position: "absolute", left: "50%", transform: "translateX(-50%)" },

  content: { position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "48px 24px" },
  
  // Search Bar
  searchBar: { display: "flex", alignItems: "center", gap: 14, background: "#ffffff", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.08)", borderRadius: 16, padding: "16px 22px", marginBottom: 40, transition: "all 0.3s ease", boxShadow: "0 4px 12px rgba(15,23,42,0.02)" },
  searchBarFocused: { borderColor: "rgba(108,99,255,0.4)", boxShadow: "0 4px 20px rgba(108,99,255,0.1), 0 0 0 3px rgba(108,99,255,0.05)" },
  searchIcon: { display: "flex", alignItems: "center", transition: "color 0.3s" },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#0f172a", fontSize: 15, fontFamily: "inherit", fontWeight: 500 },

  layout: { display: "grid", gridTemplateColumns: "360px 1fr", gap: 32, alignItems: "start" },
  
  list: { display: "flex", flexDirection: "column", gap: 12, maxHeight: "calc(100vh - 250px)", overflowY: "auto", paddingRight: 8, paddingBottom: 20 },
  
  // Clean Cards with Dynamic Top Border
  noteCard: { padding: "18px 22px", background: "#ffffff", border: "1px solid rgba(205, 143, 243, 0.06)", borderRadius: 16, cursor: "pointer", transition: "all 0.2s ease", overflow: "hidden", opacity: 0, animation: "slide-up-fade 0.5s ease-out forwards", boxShadow: "0 2px 8px rgba(15,23,42,0.02)" },
  noteCardHover: { transform: "translateY(-2px)", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }, // Removed the hardcoded black border color here
  noteCardActive: { background: "#ffffff", boxShadow: "0 4px 16px rgba(15,23,42,0.08)" },
  
  noteCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  noteRoomName: { fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, transition: "color 0.2s" },
  
  notePreview: { fontSize: 14, color: "#64748b", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "normal", marginBottom: 16 },
  
  noteFooter: { display: "flex", alignItems: "center" },
  noteDate: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, transition: "all 0.2s" },

  // Detail View - Clean structure with creative elements inside
  detailWrapper: { position: "sticky", top: 40 },
  detail: { background: "#ffffff", border: "1px solid rgba(15,23,42,0.06)", borderRadius: 24, padding: "8px", minHeight: 600, boxShadow: "0 20px 40px rgba(15,23,42,0.05)", position: "relative", overflow: "hidden", animation: "fade-in 0.3s ease-out" },
  
  detailHeaderBanner: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "32px 32px", borderRadius: 18, marginBottom: 20, transition: "background 0.3s ease" },
  detailTitle: { fontSize: 28, fontWeight: 800, fontFamily: "'Syne', sans-serif", marginBottom: 12, color: "#0f172a", letterSpacing: "-0.5px" },
  detailMeta: { fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 8 },
  detailDatePill: { fontWeight: 700 },
  dotDivider: { color: "#cbd5e1" },
  codePill: { fontFamily: "'DM Mono', monospace", background: "#ffffff", border: "1px solid rgba(15,23,42,0.06)", color: "#0f172a", padding: "4px 10px", borderRadius: 8, fontWeight: 600, letterSpacing: "0.05em", boxShadow: "0 2px 4px rgba(15,23,42,0.02)" },
  
  deleteBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#ffffff", border: "1px solid rgba(255,77,109,0.2)", borderRadius: 10, color: "#ff4d6d", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(255,77,109,0.05)" },
  
  // Document-like content area
  detailContentWrapper: { padding: "10px 32px 40px", borderLeft: "3px solid transparent", margin: "0 24px", transition: "border-color 0.3s ease" },
  detailContent: { fontSize: 16, lineHeight: 1.8, color: "#334155", whiteSpace: "pre-wrap" },

  // Empty / None States
  noSelection: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 500, background: "rgba(248,250,252,0.5)", borderRadius: 24, color: "#64748b", fontSize: 15, fontWeight: 600 },
  noSelIcon: { fontSize: 32, marginBottom: 12, opacity: 0.8 },
  
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "120px 0", gap: 12, animation: "fade-in 0.5s ease-out" },
  emptyIcon: { fontSize: 56, opacity: 0.8, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: 800, color: "#0f172a", fontFamily: "'Syne', sans-serif" },
  emptySub: { fontSize: 15, color: "#64748b", maxWidth: 300, textAlign: "center", lineHeight: 1.5 },

  loadingState: { display: "flex", justifyContent: "center", padding: "120px 0" },
  spinner: { width: 36, height: 36, borderRadius: "50%", borderWidth: "3px", borderStyle: "solid", borderColor: "rgba(15,23,42,0.08)", borderTopColor: "#6c63ff", animation: "spin 0.7s linear infinite" },
};