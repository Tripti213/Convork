import { useState, useEffect } from "react";

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
  const [waitingList, setWaitingList] = useState([]);
  const [roomLocked, setRoomLocked]   = useState(false);

  useEffect(() => {
    const sock = socket.current;
    if (!sock) return;

    const handleWaitingUpdate = ({ waiting }) => {
      console.log("[WaitingRoom] Update received:", waiting.length, "waiting");
      setWaitingList(waiting || []);
    };

    const handleLockChanged = ({ locked }) => {
      setRoomLocked(locked);
    };

    sock.on("waiting-room-update", handleWaitingUpdate);
    sock.on("room-lock-changed",   handleLockChanged);

    console.log("[WaitingRoom] Listening on socket", sock.id, "isHost:", isHost);

    return () => {
      sock.off("waiting-room-update", handleWaitingUpdate);
      sock.off("room-lock-changed",   handleLockChanged);
    };
  }, [socket.current, isHost]); // re-register when socket or host status changes

  const getInitials = (name = "") =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const allParticipants = [
    { socketId: "local", name: localUser?.name, avatarColor: localUser?.avatarColor, isLocal: true, isHost },
    ...peers.map(p => ({ ...p, isLocal: false })),
  ];

  const admitUser  = (targetSocketId) => socket.current?.emit("admit-user",  { roomId, targetSocketId });
  const denyUser   = (targetSocketId) => socket.current?.emit("deny-user",   { roomId, targetSocketId });
  const removeUser = (targetSocketId) => socket.current?.emit("remove-participant", { roomId, targetSocketId });

  const toggleLock = () => {
    const newLocked = !roomLocked;
    setRoomLocked(newLocked);
    socket.current?.emit("toggle-room-lock", { roomId, locked: newLocked });
  };

  return (
    <div style={s.panel}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.headerTitle}>In this call</span>
        <div style={s.countBadge}>{allParticipants.length}</div>
      </div>

      {/* Lock toggle — host only */}
      {isHost && (
        <button
          style={{ ...s.lockToggle, ...(roomLocked ? s.lockToggleActive : {}) }}
          onClick={toggleLock}
        >
          <span>{roomLocked ? "🔒" : "🔓"}</span>
          <span style={{ flex: 1, textAlign: "left" }}>
            {roomLocked ? "Waiting room on" : "Anyone can join"}
          </span>
          <span style={s.toggleTrack}>
            <span style={{ ...s.toggleDot, ...(roomLocked ? s.toggleDotOn : {}) }} />
          </span>
        </button>
      )}

      {/* Participants list */}
      <div style={s.list}>
        {allParticipants.map((p, i) => {
          const [g1, g2] = getGradient(p.avatarColor);
          return (
            <div key={p.socketId} style={{ ...s.item, animationDelay: `${i * 0.05}s` }}>
              <div style={{ ...s.avatar, background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                {getInitials(p.name)}
                <div style={s.onlineDot} />
              </div>
              <div style={s.info}>
                <div style={s.nameRow}>
                  <span style={s.name}>{p.name}</span>
                  <div style={s.badges}>
                    {p.isLocal && <span style={s.youBadge}>You</span>}
                    {p.isHost  && <span style={s.hostBadge}>Host</span>}
                  </div>
                </div>
                <span style={s.status}>Active</span>
              </div>
              {isHost && !p.isLocal && (
                <button style={s.removeBtn} onClick={() => removeUser(p.socketId)} title="Remove">✕</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Waiting room section — only shown to host when room is locked */}
      {isHost && roomLocked && (
        <div style={s.waitingSection}>
          <div style={s.sectionLabel}>
            <span>Waiting room</span>
            <div style={s.waitingBadge}>{waitingList.length}</div>
          </div>

          {waitingList.length === 0 ? (
            <div style={s.noWaiting}>No one waiting</div>
          ) : (
            waitingList.map(w => {
              const [g1, g2] = getGradient(w.avatarColor);
              return (
                <div key={w.socketId} style={s.waitingItem}>
                  <div style={{ ...s.avatar, background: `linear-gradient(135deg, ${g1}44, ${g2}44)` }}>
                    {getInitials(w.name)}
                  </div>
                  <div style={s.info}>
                    <span style={{ ...s.name, color: "#a0a6b8" }}>{w.name}</span>
                    <span style={s.status}>Waiting…</span>
                  </div>
                  <div style={s.waitingActions}>
                    <button style={s.admitBtn} onClick={() => admitUser(w.socketId)}>Admit</button>
                    <button style={s.denyBtn}  onClick={() => denyUser(w.socketId)}>✕</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Invite */}
      <div style={s.inviteArea}>
        <button style={s.inviteBtn} onClick={() => navigator.clipboard.writeText(window.location.href)}>
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
  countBadge: { background: "rgba(108,99,255,0.2)", color: "#a78bfa", fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "2px 8px", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(108,99,255,0.25)" },

  lockToggle: { display: "flex", alignItems: "center", gap: 8, margin: "10px 12px", padding: "9px 12px", background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)", borderRadius: 10, color: "#626880", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" },
  lockToggleActive: { background: "rgba(108,99,255,0.08)", borderColor: "rgba(108,99,255,0.25)", color: "#a78bfa" },
  toggleTrack: { width: 28, height: 16, borderRadius: 99, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: 2, flexShrink: 0 },
  toggleDot: { width: 12, height: 12, borderRadius: "50%", background: "#626880", transition: "all 0.25s" },
  toggleDotOn: { background: "#a78bfa", transform: "translateX(12px)" },

  list: { overflowY: "auto", padding: "6px 8px", flex: 1, minHeight: 0 },
  item: { display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 10, transition: "background 0.15s", cursor: "default", animation: "slide-in-up 0.3s both", position: "relative" },
  avatar: { width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, position: "relative", fontFamily: "'Syne', sans-serif" },
  onlineDot: { position: "absolute", bottom: -1, right: -1, width: 9, height: 9, borderRadius: "50%", background: "#10d9a0", borderWidth: "2px", borderStyle: "solid", borderColor: "#060810" },
  info: { flex: 1, minWidth: 0 },
  nameRow: { display: "flex", alignItems: "center", gap: 5, marginBottom: 2 },
  name: { fontSize: 13, fontWeight: 600, color: "#c8ccd8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  badges: { display: "flex", gap: 3 },
  youBadge: { fontSize: 9, fontWeight: 700, background: "rgba(108,99,255,0.2)", color: "#a78bfa", padding: "1px 5px", borderRadius: 4 },
  hostBadge: { fontSize: 9, fontWeight: 700, background: "rgba(245,158,11,0.15)", color: "#f59e0b", padding: "1px 5px", borderRadius: 4 },
  status: { fontSize: 11, color: "#3d4258" },
  removeBtn: { width: 26, height: 26, border: "none", background: "transparent", color: "#3d4258", cursor: "pointer", fontSize: 11, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" },

  waitingSection: { borderTop: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 },
  sectionLabel: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 6px" },
  waitingBadge: { background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 7px" },
  noWaiting: { padding: "8px 16px 12px", fontSize: 12, color: "#2a2f42" },
  waitingItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 10, margin: "0 8px 4px" },
  waitingActions: { display: "flex", gap: 5 },
  admitBtn: { padding: "4px 10px", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(16,217,160,0.3)", background: "rgba(16,217,160,0.08)", color: "#10d9a0", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  denyBtn: { width: 26, height: 26, borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,77,109,0.25)", background: "rgba(255,77,109,0.08)", color: "#ff4d6d", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 },

  inviteArea: { padding: "10px 12px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" },
  inviteBtn: { width: "100%", padding: "9px", background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderStyle: "dashed", borderColor: "rgba(255,255,255,0.08)", borderRadius: 10, color: "#626880", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "inherit" },
};
