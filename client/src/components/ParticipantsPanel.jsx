import { useState } from "react";

const AVATAR_GRADIENTS = {
  "#6c63ff": ["#6c63ff","#a78bfa"],
  "#3b82f6": ["#3b82f6","#6366f1"],
  "#22c55e": ["#10d9a0","#06b6d4"],
  "#a855f7": ["#a855f7","#ec4899"],
  "#f97316": ["#f59e0b","#f97316"],
  "#ec4899": ["#ec4899","#f43f5e"],
  "#14b8a6": ["#14b8a6","#10d9a0"],
};

function getGradient(color) {
  return AVATAR_GRADIENTS[color] || ["#6c63ff","#a78bfa"];
}

export default function ParticipantsPanel({ peers, localUser, socket, roomId, isHost }) {
  const [waitingList] = useState([]);

  const getInitials = (name = "") =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const allParticipants = [
    { socketId: "local", name: localUser?.name, avatarColor: localUser?.avatarColor, isLocal: true, isHost },
    ...peers.map(p => ({ ...p, isLocal: false })),
  ];

  return (
    <div style={s.panel}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.headerTitle}>In this call</span>
        <div style={s.countBadge}>{allParticipants.length}</div>
      </div>

      <div style={s.list}>
        {allParticipants.map((p, i) => {
          const [g1, g2] = getGradient(p.avatarColor);
          return (
            <div key={p.socketId} style={{ ...s.item, animationDelay: `${i * 0.05}s` }}>
              {/* Avatar */}
              <div style={{ ...s.avatar, background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                {getInitials(p.name)}
                <div style={s.onlineDot} />
              </div>

              {/* Info */}
              <div style={s.info}>
                <div style={s.nameRow}>
                  <span style={s.name}>{p.name}</span>
                  <div style={s.badges}>
                    {p.isLocal && <span style={s.youBadge}>You</span>}
                    {p.isHost && <span style={s.hostBadge}>Host</span>}
                  </div>
                </div>
                <span style={s.status}>Active</span>
              </div>

              {/* Actions */}
              {isHost && !p.isLocal && (
                <button style={s.removeBtn}
                  onClick={() => socket.current?.emit("remove-participant", { roomId, targetSocketId: p.socketId })}
                  title="Remove">
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Waiting room */}
      {waitingList.length > 0 && (
        <>
          <div style={s.sectionLabel}>
            <span>Waiting room</span>
            <div style={s.waitingBadge}>{waitingList.length}</div>
          </div>
          {waitingList.map(w => (
            <div key={w.id} style={s.waitingItem}>
              <div style={{ ...s.avatar, background: "rgba(255,255,255,0.06)" }}>
                {getInitials(w.name)}
              </div>
              <div style={s.info}>
                <span style={{ ...s.name, color: "#626880" }}>{w.name}</span>
                <span style={s.status}>Waiting…</span>
              </div>
              <div style={s.waitingActions}>
                <button style={s.admitBtn}>Admit</button>
                <button style={s.denyBtn}>✕</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Footer invite */}
      <div style={s.inviteArea}>
        <button style={s.inviteBtn}
          onClick={() => navigator.clipboard.writeText(window.location.href)}>
          <span>🔗</span>
          <span>Copy invite link</span>
        </button>
      </div>
    </div>
  );
}

const s = {
  panel: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  headerTitle: { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3d4258" },
  countBadge: { background: "rgba(108,99,255,0.2)", color: "#a78bfa", fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "2px 8px", border: "1px solid rgba(108,99,255,0.25)" },
  list: { flex: 1, overflowY: "auto", padding: "6px 8px" },
  item: { display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderRadius: 10, transition: "background 0.15s", cursor: "default", animation: "slide-in-up 0.3s both", position: "relative" },
  avatar: { width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, position: "relative", fontFamily: "'Syne', sans-serif" },
  onlineDot: { position: "absolute", bottom: -1, right: -1, width: 9, height: 9, borderRadius: "50%", background: "#10d9a0", border: "2px solid #060810", boxShadow: "0 0 6px rgba(16,217,160,0.6)" },
  info: { flex: 1, minWidth: 0 },
  nameRow: { display: "flex", alignItems: "center", gap: 5, marginBottom: 2 },
  name: { fontSize: 13, fontWeight: 600, color: "#c8ccd8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  badges: { display: "flex", gap: 3 },
  youBadge: { fontSize: 9, fontWeight: 700, background: "rgba(108,99,255,0.2)", color: "#a78bfa", padding: "1px 5px", borderRadius: 4, letterSpacing: "0.04em" },
  hostBadge: { fontSize: 9, fontWeight: 700, background: "rgba(245,158,11,0.15)", color: "#f59e0b", padding: "1px 5px", borderRadius: 4, letterSpacing: "0.04em" },
  status: { fontSize: 11, color: "#3d4258" },
  removeBtn: { width: 26, height: 26, border: "none", background: "transparent", color: "#3d4258", cursor: "pointer", fontSize: 11, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", opacity: 0 },
  sectionLabel: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 6px", borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 4 },
  waitingBadge: { background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 7px" },
  waitingItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderRadius: 10 },
  waitingActions: { display: "flex", gap: 5 },
  admitBtn: { padding: "4px 10px", border: "1px solid rgba(16,217,160,0.3)", background: "rgba(16,217,160,0.08)", color: "#10d9a0", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  denyBtn: { width: 26, height: 26, border: "1px solid rgba(255,77,109,0.25)", background: "rgba(255,77,109,0.08)", color: "#ff4d6d", borderRadius: 7, fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" },
  inviteArea: { padding: "10px 12px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" },
  inviteBtn: { width: "100%", padding: "9px", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 10, color: "#626880", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "inherit", transition: "all 0.2s", letterSpacing: "0.02em" },
};
