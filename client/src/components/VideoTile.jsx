import { useEffect, useRef, useState } from "react";

const AVATAR_GRADIENTS = [
  ["#6c63ff", "#a78bfa"], ["#10d9a0", "#06b6d4"], ["#f59e0b", "#f97316"],
  ["#ec4899", "#f43f5e"], ["#3b82f6", "#6366f1"], ["#14b8a6", "#10d9a0"],
];

function getGradient(color) {
  const map = {
    "#3b82f6": AVATAR_GRADIENTS[4], "#22c55e": AVATAR_GRADIENTS[1],
    "#a855f7": AVATAR_GRADIENTS[0], "#f97316": AVATAR_GRADIENTS[2],
    "#ec4899": AVATAR_GRADIENTS[3], "#14b8a6": AVATAR_GRADIENTS[5],
    "#6c63ff": AVATAR_GRADIENTS[0],
  };
  return map[color] || AVATAR_GRADIENTS[0];
}

export default function VideoTile({
  stream, name, avatarColor, isLocal, isMuted, isCamOff,
  isSpeaking, onPin, isPinned,
}) {
  const videoRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hovered, setHovered] = useState(false);

  // ── SINGLE effect, SINGLE responsibility: attach stream, watch its track ──
  // Simple and robust: attach srcObject once per stream. Then use a single
  // lightweight poll (only while this stream is active) purely to detect
  // when the video track ID inside this SAME stream object changes — which
  // happens when replaceTrack() swaps tracks without changing the stream
  // reference. No second effect, no dependency-array races.
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) {
      setHasVideo(false);
      return;
    }

    // Attach immediately
    videoEl.srcObject = stream;
    videoEl.play().catch(() => {});

    let lastTrackId = stream.getVideoTracks()[0]?.id || null;

    const updateHasVideo = () => {
      const track = stream.getVideoTracks()[0];
      setHasVideo(!!track && track.enabled && track.readyState === "live");
    };
    updateHasVideo();

    // Poll for track swaps within this same stream (covers replaceTrack
    // cases where srcObject doesn't auto-refresh on some browsers).
    // This interval is cleaned up whenever `stream` changes or unmounts —
    // since it's declared inside THIS effect, there's no stale-closure risk.
    const pollId = setInterval(() => {
      const track = stream.getVideoTracks()[0];
      const trackId = track?.id || null;

      if (trackId !== lastTrackId) {
        lastTrackId = trackId;
        // Force the video element to pick up the new track
        videoEl.srcObject = null;
        videoEl.srcObject = stream;
        videoEl.play().catch(() => {});
      }
      updateHasVideo();
    }, 400);

    const track = stream.getVideoTracks()[0];
    if (track) {
      track.addEventListener("ended", updateHasVideo);
      track.addEventListener("mute", updateHasVideo);
      track.addEventListener("unmute", updateHasVideo);
    }

    return () => {
      clearInterval(pollId);
      if (track) {
        track.removeEventListener("ended", updateHasVideo);
        track.removeEventListener("mute", updateHasVideo);
        track.removeEventListener("unmute", updateHasVideo);
      }
    };
  }, [stream]); // ONLY depends on stream — no other deps to cause races

  useEffect(() => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) setHasVideo(track.enabled && track.readyState === "live" && !isCamOff);
  }, [isCamOff, stream]);

  const initials = name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const showVideo = hasVideo && !isCamOff;
  const [g1, g2] = getGradient(avatarColor);

  return (
    <div
      style={{ ...s.tile, ...(isSpeaking ? s.speaking : {}), ...(isPinned ? s.pinned : {}), ...(isLocal ? s.self : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPin}
    >
      <video ref={videoRef} autoPlay playsInline muted={isLocal}
        style={{ ...s.video, opacity: showVideo ? 1 : 0, transform: isLocal ? "scaleX(-1)" : "none" }} />

      {!showVideo && (
        <div style={{ ...s.avatarBg, background: `radial-gradient(circle at 30% 30%, ${g1}22, ${g2}11), linear-gradient(135deg, #0c0f18, #111520)` }}>
          <div style={{ ...s.avatarRing, borderColor: `${g1}33` }}>
            <div style={{ ...s.avatarRing2, borderColor: `${g1}22` }} />
          </div>
          <div style={{ ...s.avatar, background: `linear-gradient(135deg, ${g1}, ${g2})` }}>{initials}</div>
        </div>
      )}

      <div style={s.bottomGradient} />
      {isSpeaking && <div style={s.speakingRing} />}

      <div style={s.infoBar}>
        <div style={s.nameChip}>
          {isMuted && <div style={s.mutedIcon}>🔇</div>}
          <span style={s.nameText}>{isLocal ? `${name} (You)` : name}</span>
          {isSpeaking && <div style={s.speakingDot} />}
        </div>
      </div>

      <div style={{ ...s.hoverActions, opacity: hovered ? 1 : 0 }}>
        <button style={s.actionBtn} onClick={e => { e.stopPropagation(); onPin?.(); }} title={isPinned ? "Unpin" : "Pin"}>
          {isPinned ? "📌" : "⊞"}
        </button>
      </div>

      {(isLocal || isSpeaking) && (
        <div style={{ ...s.cornerAccent, background: isLocal ? "#6c63ff" : "#10d9a0" }} />
      )}
    </div>
  );
}

const s = {
  tile: { position: "relative", background: "#0c0f18", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "border-color 0.3s, box-shadow 0.3s", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 },
  speaking: { borderColor: "rgba(16,217,160,0.5)", boxShadow: "0 0 0 1px rgba(16,217,160,0.2), 0 0 20px rgba(16,217,160,0.1)" },
  self: { borderColor: "rgba(108,99,255,0.3)" },
  pinned: { gridColumn: "span 2", gridRow: "span 2" },
  video: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.3s" },
  avatarBg: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  avatarRing: { position: "absolute", width: 120, height: 120, borderRadius: "50%", borderWidth: "1px", borderStyle: "solid", display: "flex", alignItems: "center", justifyContent: "center" },
  avatarRing2: { position: "absolute", width: 100, height: 100, borderRadius: "50%", borderWidth: "1px", borderStyle: "solid" },
  avatar: { width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.5px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" },
  bottomGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, rgba(6,8,16,0.85))", pointerEvents: "none", zIndex: 1 },
  speakingRing: { position: "absolute", inset: 0, borderRadius: "inherit", borderWidth: "2px", borderStyle: "solid", borderColor: "rgba(16,217,160,0.5)", pointerEvents: "none", zIndex: 2 },
  infoBar: { position: "absolute", bottom: 10, left: 10, zIndex: 3 },
  nameChip: { display: "flex", alignItems: "center", gap: 5, background: "rgba(6,8,16,0.75)", backdropFilter: "blur(8px)", borderRadius: 8, padding: "4px 10px", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)" },
  nameText: { fontSize: 12, fontWeight: 600, color: "#c8ccd8" },
  mutedIcon: { fontSize: 11 },
  speakingDot: { width: 6, height: 6, borderRadius: "50%", background: "#10d9a0" },
  hoverActions: { position: "absolute", top: 10, right: 10, zIndex: 4, transition: "opacity 0.2s", display: "flex", gap: 5 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, background: "rgba(6,8,16,0.8)", backdropFilter: "blur(8px)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.1)", color: "#a0a6b8", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" },
  cornerAccent: { position: "absolute", top: 0, left: 0, width: 3, height: 40, borderBottomRightRadius: 3 },
};