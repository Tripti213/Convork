import { useState } from "react";

const REACTIONS = ["👍", "✋", "❤️", "😄", "🎉", "👏", "🤔", "🔥"];

export default function Controls({
  audioEnabled, videoEnabled, isSharingScreen, isWhiteboardOpen,
  onToggleAudio, onToggleVideo, onToggleScreen, onToggleWhiteboard,
  onReaction, onLeave,
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [pressedBtn, setPressedBtn] = useState(null);

  const press = (key, fn) => {
    setPressedBtn(key);
    fn();
    setTimeout(() => setPressedBtn(null), 200);
  };

  return (
    <div style={s.wrap}>
      <div style={s.bar}>
        <CtrlBtn id="mic"
          icon={audioEnabled ? "🎙" : "🔇"}
          label={audioEnabled ? "Mute" : "Unmute"}
          danger={!audioEnabled}
          pressed={pressedBtn === "mic"}
          onClick={() => press("mic", onToggleAudio)}
        />
        <CtrlBtn id="cam"
          icon="📷"
          label={videoEnabled ? "Camera" : "Cam off"}
          active={!videoEnabled}
          pressed={pressedBtn === "cam"}
          onClick={() => press("cam", onToggleVideo)}
        />
        <CtrlBtn id="share"
          icon="🖥"
          label={isSharingScreen ? "Stop" : "Share"}
          active={isSharingScreen}
          glow={isSharingScreen}
          pressed={pressedBtn === "share"}
          onClick={() => press("share", onToggleScreen)}
        />

        <div style={s.divider} />

        <CtrlBtn id="wb"
          icon="✏️"
          label={isWhiteboardOpen ? "Close" : "Board"}
          active={isWhiteboardOpen}
          pressed={pressedBtn === "wb"}
          onClick={() => press("wb", onToggleWhiteboard)}
        />

        <div style={{ position: "relative" }}>
          <CtrlBtn id="react"
            icon="✋"
            label="React"
            active={showReactions}
            pressed={pressedBtn === "react"}
            onClick={() => {
              setPressedBtn("react");
              setShowReactions(v => !v);
              setTimeout(() => setPressedBtn(null), 200);
            }}
          />
          {showReactions && (
            <div style={s.reactionPicker}>
              <div style={s.reactionGrid}>
                {REACTIONS.map(emoji => (
                  <button key={emoji} style={s.reactionBtn}
                    onClick={() => { onReaction(emoji); setShowReactions(false); }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={s.divider} />

        <button style={s.leaveBtn} onClick={onLeave}>
          <span>End call</span>
          <span style={s.leaveIcon}>✕</span>
        </button>
      </div>
    </div>
  );
}

function CtrlBtn({ icon, label, onClick, active, danger, glow, pressed }) {
  const [hovered, setHovered] = useState(false);

  // Build style without mixing shorthand border + borderColor
  const getBtnStyle = () => {
    // Base
    let borderWidth = "1px";
    let borderStyle = "solid";
    let borderColor = "transparent";
    let background = "transparent";
    let color = "#626880";
    let boxShadow = "none";
    let transform = "scale(1)";

    if (danger) {
      background = "rgba(255,77,109,0.12)";
      borderColor = "rgba(255,77,109,0.25)";
      color = "#ff6b8a";
    } else if (active) {
      background = "rgba(108,99,255,0.15)";
      borderColor = "rgba(108,99,255,0.35)";
      color = "#a78bfa";
    } else if (glow) {
      background = "rgba(16,217,160,0.08)";
      borderColor = "rgba(16,217,160,0.4)";
      color = "#10d9a0";
      boxShadow = "0 0 16px rgba(16,217,160,0.25)";
    }

    if (hovered && !pressed) {
      background = danger ? "rgba(255,77,109,0.18)"
        : active ? "rgba(108,99,255,0.22)"
        : "rgba(255,255,255,0.06)";
      color = danger ? "#ff6b8a" : active ? "#a78bfa" : "#a0a6b8";
      borderColor = danger ? "rgba(255,77,109,0.35)"
        : active ? "rgba(108,99,255,0.5)"
        : "rgba(255,255,255,0.1)";
    }

    if (pressed) {
      transform = "scale(0.93)";
      background = "rgba(255,255,255,0.07)";
    }

    return {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      background,
      borderWidth,
      borderStyle,
      borderColor,
      borderRadius: 12,
      padding: "8px 14px",
      cursor: "pointer",
      color,
      minWidth: 62,
      transition: "all 0.15s ease",
      fontFamily: "inherit",
      boxShadow,
      transform,
    };
  };

  return (
    <button
      style={getBtnStyle()}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={s.btnIcon}>{icon}</span>
      <span style={s.btnLabel}>{label}</span>
    </button>
  );
}

const s = {
  wrap: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "center",
    padding: "10px 0 4px",
  },
  bar: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(12,15,24,0.9)",
    backdropFilter: "blur(20px)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: "8px 12px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  btnIcon: { fontSize: 20, lineHeight: 1 },
  btnLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  divider: {
    width: 1,
    height: 36,
    background: "rgba(255,255,255,0.06)",
    margin: "0 4px",
  },
  leaveBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "linear-gradient(135deg, rgba(255,77,109,0.9), rgba(255,50,80,0.9))",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: 12,
    padding: "10px 18px",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.02em",
    boxShadow: "0 4px 16px rgba(255,77,109,0.3)",
    transition: "all 0.15s",
  },
  leaveIcon: { fontSize: 12, opacity: 0.8 },
  reactionPicker: {
    position: "absolute",
    bottom: "calc(100% + 12px)",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(12,15,24,0.95)",
    backdropFilter: "blur(20px)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 10,
    zIndex: 100,
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    animation: "slide-in-up 0.2s ease",
  },
  reactionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 4,
  },
  reactionBtn: {
    width: 40,
    height: 40,
    border: "none",
    background: "transparent",
    fontSize: 22,
    cursor: "pointer",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.1s",
  },
};