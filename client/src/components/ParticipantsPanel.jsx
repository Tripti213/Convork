import { useState } from "react";

export default function ParticipantsPanel({ peers, localUser, socket, roomId, isHost }) {
  const [waitingList] = useState([]); // populated from socket "waiting-room" events in Phase 6

  const getInitials = (name = "") =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const allParticipants = [
    {
      socketId: "local",
      name: localUser?.name,
      avatarColor: localUser?.avatarColor,
      isLocal: true,
      isHost,
    },
    ...peers.map((p) => ({ ...p, isLocal: false })),
  ];

  return (
    <div style={styles.panel}>
      <div style={styles.count}>
        {allParticipants.length} participant{allParticipants.length !== 1 ? "s" : ""}
      </div>

      {allParticipants.map((p) => (
        <div key={p.socketId} style={styles.item}>
          <div style={{ ...styles.avatar, background: p.avatarColor || "#3b82f6" }}>
            {getInitials(p.name)}
          </div>
          <div style={styles.info}>
            <div style={styles.name}>
              {p.name}
              {p.isLocal && <span style={styles.youBadge}>You</span>}
              {p.isHost && <span style={styles.hostBadge}>Host</span>}
            </div>
          </div>
          {isHost && !p.isLocal && (
            <button
              style={styles.removeBtn}
              onClick={() =>
                socket.current?.emit("remove-participant", { roomId, targetSocketId: p.socketId })
              }
              title="Remove from call"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {waitingList.length > 0 && (
        <>
          <div style={styles.sectionLabel}>Waiting room</div>
          {waitingList.map((w) => (
            <div key={w.id} style={styles.item}>
              <div style={{ ...styles.avatar, background: "#374151" }}>?</div>
              <div style={styles.info}>
                <div style={{ ...styles.name, color: "#7c8490" }}>{w.name}</div>
              </div>
              <div style={styles.waitingActions}>
                <button style={styles.admitBtn}>Admit</button>
                <button style={styles.denyBtn}>Deny</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const styles = {
  panel: { flex: 1, overflowY: "auto", padding: "8px 0" },
  count: { padding: "6px 16px 10px", fontSize: 11, fontWeight: 600, color: "#5a6270", letterSpacing: 0.5, textTransform: "uppercase" },
  sectionLabel: { padding: "12px 16px 6px", fontSize: 11, fontWeight: 600, color: "#5a6270", letterSpacing: 0.5, textTransform: "uppercase", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 8 },
  item: { display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", transition: "background 0.1s", borderRadius: 0 },
  avatar: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff", flexShrink: 0 },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: 500, color: "#e8eaed", display: "flex", alignItems: "center", gap: 6 },
  youBadge: { fontSize: 10, background: "rgba(59,130,246,0.2)", color: "#60a5fa", padding: "1px 5px", borderRadius: 4, fontWeight: 500 },
  hostBadge: { fontSize: 10, background: "rgba(245,158,11,0.2)", color: "#fbbf24", padding: "1px 5px", borderRadius: 4, fontWeight: 500 },
  removeBtn: { width: 24, height: 24, border: "none", background: "transparent", color: "#5a6270", cursor: "pointer", fontSize: 12, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" },
  waitingActions: { display: "flex", gap: 4 },
  admitBtn: { padding: "3px 8px", border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.1)", color: "#4ade80", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  denyBtn: { padding: "3px 8px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
};
