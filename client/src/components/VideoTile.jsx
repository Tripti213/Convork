import { useEffect, useRef, useState } from "react";

export default function VideoTile({ stream, name, avatarColor, isLocal, isMuted, isCamOff, isSpeaking, onPin, isPinned }) {
  const videoRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) {
      setHasVideo(false);
      return;
    }

    // Always re-attach — this is what fixes the black screen after screen share
    videoEl.srcObject = stream;
    videoEl.play().catch(() => {});

    const checkVideo = () => {
      const track = stream.getVideoTracks()[0];
      setHasVideo(!!track && track.enabled && track.readyState === "live");
    };

    checkVideo();

    // Re-check when tracks change
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.addEventListener("ended", checkVideo);
      videoTrack.addEventListener("mute", checkVideo);
      videoTrack.addEventListener("unmute", checkVideo);
    }

    // Also watch for new tracks being added to the stream (screen share restore)
    stream.addEventListener("addtrack", checkVideo);
    stream.addEventListener("removetrack", checkVideo);

    return () => {
      if (videoTrack) {
        videoTrack.removeEventListener("ended", checkVideo);
        videoTrack.removeEventListener("mute", checkVideo);
        videoTrack.removeEventListener("unmute", checkVideo);
      }
      stream.removeEventListener("addtrack", checkVideo);
      stream.removeEventListener("removetrack", checkVideo);
    };
  }, [stream]); // re-runs every time stream reference changes

  // Also re-check hasVideo when isCamOff changes
  useEffect(() => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      setHasVideo(track.enabled && track.readyState === "live" && !isCamOff);
    }
  }, [isCamOff, stream]);

  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const showVideo = hasVideo && !isCamOff;

  return (
    <div
      style={{
        ...styles.tile,
        ...(isSpeaking ? styles.speaking : {}),
        ...(isPinned ? styles.pinned : {}),
        ...(isLocal ? styles.self : {}),
      }}
      onClick={onPin}
    >
      {/* Video always mounted, visibility toggled */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          ...styles.video,
          opacity: showVideo ? 1 : 0,
          transform: isLocal ? "scaleX(-1)" : "none",
        }}
      />

      {/* Avatar shown when no video */}
      {!showVideo && (
        <div style={styles.avatarWrap}>
          <div style={{ ...styles.avatar, background: avatarColor || "#3b82f6" }}>
            {initials}
          </div>
        </div>
      )}

      {/* Name label */}
      <div style={styles.label}>
        {isMuted && <span style={styles.mutedDot} title="Muted" />}
        <span>{isLocal ? `${name} (You)` : name}</span>
        {isSpeaking && <span style={styles.speakingBadge}>●</span>}
      </div>

      {/* Pin button */}
      <button
        style={styles.pinBtn}
        onClick={(e) => { e.stopPropagation(); onPin?.(); }}
        title={isPinned ? "Unpin" : "Pin"}
      >
        {isPinned ? "📌" : "⊞"}
      </button>
    </div>
  );
}

const styles = {
  tile: {
    position: "relative",
    background: "#161a1e",
    border: "1.5px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color 0.2s",
    minHeight: 0,
  },
  speaking: {
    borderColor: "#22c55e",
    boxShadow: "0 0 0 1px #22c55e inset",
  },
  self: {
    borderColor: "rgba(59,130,246,0.5)",
  },
  pinned: {
    gridColumn: "span 2",
    gridRow: "span 2",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    position: "absolute",
    inset: 0,
    transition: "opacity 0.2s",
  },
  avatarWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #1e2329, #252c34)",
    position: "absolute",
    inset: 0,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    fontWeight: 600,
    color: "#fff",
    letterSpacing: -0.5,
    fontFamily: "'DM Sans', sans-serif",
  },
  label: {
    position: "absolute",
    bottom: 10,
    left: 10,
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 500,
    padding: "3px 8px",
    background: "rgba(0,0,0,0.65)",
    borderRadius: 6,
    backdropFilter: "blur(4px)",
    color: "#e8eaed",
    fontFamily: "'DM Sans', sans-serif",
    zIndex: 2,
  },
  mutedDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#ef4444",
    display: "inline-block",
  },
  speakingBadge: {
    color: "#22c55e",
    fontSize: 10,
  },
  pinBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 6,
    background: "rgba(0,0,0,0.55)",
    border: "none",
    color: "#a0a6b0",
    cursor: "pointer",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    backdropFilter: "blur(4px)",
  },
};