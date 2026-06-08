import { useState } from "react";

export default function Controls({
  audioEnabled,
  videoEnabled,
  isSharingScreen,
  onToggleAudio,
  onToggleVideo,
  onToggleScreen,
  onToggleWhiteboard,
  onReaction,
  onLeave,
  isWhiteboardOpen,
}) {
  const [showReactions, setShowReactions] = useState(false);
  const REACTIONS = ["👍", "✋", "❤️", "😄", "🎉", "👏", "🤔", "👎"];

  return (
    <div style={styles.bar}>
      {/* Mic */}
      <CtrlBtn
        icon={audioEnabled ? "🎙" : "🔇"}
        label={audioEnabled ? "Mute" : "Unmute"}
        onClick={onToggleAudio}
        danger={!audioEnabled}
      />

      {/* Camera */}
      <CtrlBtn
        icon={videoEnabled ? "📷" : "🚫"}
        label={videoEnabled ? "Camera" : "Cam Off"}
        onClick={onToggleVideo}
        active={!videoEnabled}
      />

      {/* Screen share */}
      <CtrlBtn
        icon="🖥"
        label={isSharingScreen ? "Stop" : "Share"}
        onClick={onToggleScreen}
        active={isSharingScreen}
      />

      {/* Whiteboard */}
      <CtrlBtn
        icon="✏️"
        label={isWhiteboardOpen ? "Close" : "Board"}
        onClick={onToggleWhiteboard}
        active={isWhiteboardOpen}
      />

      {/* Reactions */}
      <div style={{ position: "relative" }}>
        <CtrlBtn
          icon="✋"
          label="React"
          onClick={() => setShowReactions((v) => !v)}
          active={showReactions}
        />
        {showReactions && (
          <div style={styles.reactionPicker}>
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                style={styles.reactionBtn}
                onClick={() => { onReaction(emoji); setShowReactions(false); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={styles.divider} />

      {/* Leave */}
      <button style={styles.leaveBtn} onClick={onLeave}>
        Leave
      </button>
    </div>
  );
}

function CtrlBtn({ icon, label, onClick, active, danger }) {
  return (
    <button
      style={{
        ...styles.btn,
        ...(active ? styles.btnActive : {}),
        ...(danger ? styles.btnDanger : {}),
      }}
      onClick={onClick}
    >
      <span style={styles.icon}>{icon}</span>
      <span style={styles.label}>{label}</span>
    </button>
  );
}

const styles = {
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 0 4px",
    flexShrink: 0,
    flexWrap: "wrap",
  },
  btn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    background: "#1e2329",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 8,
    padding: "10px 18px",
    cursor: "pointer",
    color: "#7c8490",
    fontSize: 11,
    fontWeight: 500,
    minWidth: 68,
    transition: "all 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  btnActive: {
    background: "rgba(59,130,246,0.15)",
    borderColor: "rgba(59,130,246,0.4)",
    color: "#3b82f6",
  },
  btnDanger: {
    background: "rgba(239,68,68,0.1)",
    borderColor: "rgba(239,68,68,0.3)",
    color: "#ef4444",
  },
  icon: { fontSize: 20, lineHeight: 1 },
  label: {},
  leaveBtn: {
    background: "#ef4444",
    border: "none",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "opacity 0.15s",
  },
  divider: {
    width: 1,
    height: 40,
    background: "rgba(255,255,255,0.07)",
    margin: "0 4px",
  },
  reactionPicker: {
    position: "absolute",
    bottom: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1e2329",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 8,
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
    width: 160,
    zIndex: 100,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  reactionBtn: {
    width: 34,
    height: 34,
    border: "none",
    background: "transparent",
    fontSize: 20,
    cursor: "pointer",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.1s",
  },
};
