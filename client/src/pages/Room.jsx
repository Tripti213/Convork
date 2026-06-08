import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { useMedia } from "../hooks/useMedia";
import { useWebRTC } from "../hooks/useWebRTC";

import VideoTile from "../components/VideoTile";
import Controls from "../components/Controls";
import ChatPanel from "../components/ChatPanel";
import FilesPanel from "../components/FilesPanel";
import ParticipantsPanel from "../components/ParticipantsPanel";
import Whiteboard from "../components/Whiteboard";

export default function Room() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const roomName = searchParams.get("name") || "Meeting";
  const roomCode = searchParams.get("code") || "";

  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { socket, emit, on, disconnect } = useSocket(token);

  const {
    localStream,
    screenStream,
    localVideoRef,
    audioEnabled,
    videoEnabled,
    isSharingScreen,
    mediaError,
    startMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useMedia();

  const { peers, replaceTrack, destroyAll } = useWebRTC({ socket, roomId, localStream });

  const [sidebarTab, setSidebarTab] = useState("people"); // people | chat | files
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [pinnedSocketId, setPinnedSocketId] = useState(null);
  const [reactions, setReactions] = useState([]); // { id, emoji, name }
  const [elapsed, setElapsed] = useState(0);
  const [mediaReady, setMediaReady] = useState(false);

  // ─── Start media and join room ─────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const stream = await startMedia();
      if (stream) {
        setMediaReady(true);
      }
    };
    init();
  }, []);

  // Join socket room once media and socket are ready
  useEffect(() => {
    if (!mediaReady || !socket.current) return;
    emit("join-room", { roomId, avatarColor: user?.avatarColor });
  }, [mediaReady, socket.current]);

  // ─── Meeting timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ─── Reactions from others ─────────────────────────────────────────────────
  useEffect(() => {
    const unsub = on("reaction", ({ name, emoji }) => {
      const id = Date.now() + Math.random();
      setReactions((prev) => [...prev, { id, emoji, name }]);
      setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2500);
    });
    return unsub;
  }, [on]);

  // ─── Screen share ──────────────────────────────────────────────────────────
  const handleToggleScreen = useCallback(async () => {
    if (isSharingScreen) {
      const originalTrack = stopScreenShare(screenStream);
      if (originalTrack) {
        const screenTrack = screenStream?.getVideoTracks()[0];
        if (screenTrack) replaceTrack(screenTrack, originalTrack);
      }
      emit("screen-share-stopped", { roomId });
    } else {
      const displayStream = await startScreenShare();
      if (displayStream) {
        const screenTrack = displayStream.getVideoTracks()[0];
        const localVideoTrack = localStream?.getVideoTracks()[0];
        if (localVideoTrack) replaceTrack(localVideoTrack, screenTrack);
        emit("screen-share-started", { roomId });
      }
    }
  }, [isSharingScreen, screenStream, localStream, roomId]);

  // ─── Toggle audio/video and broadcast state ────────────────────────────────
  const handleToggleAudio = () => {
    const enabled = toggleAudio();
    emit("media-state", { roomId, audio: enabled, video: videoEnabled });
  };

  const handleToggleVideo = () => {
    const enabled = toggleVideo();
    emit("media-state", { roomId, audio: audioEnabled, video: enabled });
  };

  // ─── Leave room ────────────────────────────────────────────────────────────
  const handleLeave = () => {
    destroyAll();
    localStream?.getTracks().forEach((t) => t.stop());
    disconnect();
    navigate("/dashboard");
  };

  // ─── Reactions ─────────────────────────────────────────────────────────────
  const handleReaction = (emoji) => {
    emit("reaction", { roomId, emoji });
  };

  // ─── Compute video grid columns ───────────────────────────────────────────
  const totalTiles = peers.length + 1; // +1 for local
  const gridCols = totalTiles <= 1 ? 1 : totalTiles <= 4 ? 2 : 3;

  if (mediaError) {
    return (
      <div style={styles.errorPage}>
        <div style={styles.errorCard}>
          <div style={{ fontSize: 32 }}>📷</div>
          <h2 style={{ color: "#e8eaed", marginBottom: 8 }}>Camera/Mic Access Required</h2>
          <p style={{ color: "#7c8490", marginBottom: 16, textAlign: "center" }}>{mediaError}</p>
          <button style={styles.retryBtn} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* TOP BAR */}
      <div style={styles.topbar}>
        <div style={styles.brand}>
          <div style={styles.brandDot} />
          Convork
        </div>
        <div style={styles.roomInfo}>
          <div style={styles.liveDot} />
          <span>{roomName}</span>
          <span style={styles.roomCode}>{roomCode}</span>
        </div>
        <div style={styles.topRight}>
          <span style={styles.timer}>{formatElapsed(elapsed)}</span>
          <button
            style={styles.iconBtn}
            onClick={() => navigator.clipboard.writeText(roomCode)}
            title="Copy room code"
          >
            🔗
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        {/* VIDEO AREA */}
        <div style={styles.videoArea}>
          {/* Whiteboard overlay */}
          {isWhiteboardOpen && (
            <div style={styles.whiteboardOverlay}>
              <Whiteboard
                socket={socket}
                roomId={roomId}
                onClose={() => setIsWhiteboardOpen(false)}
              />
            </div>
          )}

          {/* Video grid */}
          <div style={{ ...styles.videoGrid, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
            {/* Local tile */}
            <VideoTile
              stream={localStream}
              name={user?.name}
              avatarColor={user?.avatarColor}
              isLocal={true}
              isMuted={!audioEnabled}
              isCamOff={!videoEnabled}
              isPinned={pinnedSocketId === "local"}
              onPin={() => setPinnedSocketId(pinnedSocketId === "local" ? null : "local")}
            />

            {/* Remote peers */}
            {peers.map((peer) => (
              <VideoTile
                key={peer.socketId}
                stream={peer.stream}
                name={peer.name}
                avatarColor={peer.avatarColor}
                isLocal={false}
                isPinned={pinnedSocketId === peer.socketId}
                onPin={() => setPinnedSocketId(pinnedSocketId === peer.socketId ? null : peer.socketId)}
              />
            ))}
          </div>

          {/* Floating reactions */}
          <div style={styles.reactionsContainer}>
            {reactions.map((r) => (
              <div key={r.id} style={styles.reactionFloat}>
                <span style={styles.reactionEmoji}>{r.emoji}</span>
                <span style={styles.reactionName}>{r.name}</span>
              </div>
            ))}
          </div>

          {/* Controls */}
          <Controls
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            isSharingScreen={isSharingScreen}
            isWhiteboardOpen={isWhiteboardOpen}
            onToggleAudio={handleToggleAudio}
            onToggleVideo={handleToggleVideo}
            onToggleScreen={handleToggleScreen}
            onToggleWhiteboard={() => setIsWhiteboardOpen((v) => !v)}
            onReaction={handleReaction}
            onLeave={handleLeave}
          />
        </div>

        {/* SIDEBAR */}
        <div style={styles.sidebar}>
          {/* Tabs */}
          <div style={styles.tabs}>
            {[
              { id: "people", label: `People (${peers.length + 1})` },
              { id: "chat", label: "Chat" },
              { id: "files", label: "Files" },
            ].map(({ id, label }) => (
              <button
                key={id}
                style={{ ...styles.tab, ...(sidebarTab === id ? styles.tabActive : {}) }}
                onClick={() => setSidebarTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          {sidebarTab === "people" && (
            <ParticipantsPanel
              peers={peers}
              localUser={user}
              socket={socket}
              roomId={roomId}
              isHost={true}
            />
          )}
          {sidebarTab === "chat" && (
            <ChatPanel socket={socket} roomId={roomId} user={user} />
          )}
          {sidebarTab === "files" && (
            <FilesPanel socket={socket} roomId={roomId} token={token} />
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { height: "100vh", display: "flex", flexDirection: "column", background: "#0d0f11", fontFamily: "'DM Sans', sans-serif", color: "#e8eaed", overflow: "hidden" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#161a1e", flexShrink: 0, gap: 12 },
  brand: { display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 15 },
  brandDot: { width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 8px rgba(59,130,246,0.6)", animation: "pulse 2s infinite" },
  roomInfo: { display: "flex", alignItems: "center", gap: 10, background: "#1e2329", border: "1px solid rgba(255,255,255,0.07)", padding: "5px 14px", borderRadius: 99, fontSize: 13 },
  liveDot: { width: 6, height: 6, borderRadius: "50%", background: "#22c55e" },
  roomCode: { fontFamily: "monospace", fontSize: 12, color: "#5a6270", letterSpacing: 1 },
  topRight: { display: "flex", alignItems: "center", gap: 10 },
  timer: { fontFamily: "monospace", fontSize: 13, color: "#5a6270" },
  iconBtn: { width: 34, height: 34, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#7c8490", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" },
  main: { flex: 1, display: "flex", overflow: "hidden" },
  videoArea: { flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12, position: "relative", overflow: "hidden" },
  whiteboardOverlay: { position: "absolute", inset: 0, zIndex: 50 },
  videoGrid: { flex: 1, display: "grid", gap: 10, overflow: "hidden" },
  reactionsContainer: { position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, pointerEvents: "none", zIndex: 10 },
  reactionFloat: { display: "flex", flexDirection: "column", alignItems: "center", animation: "floatUp 2.5s ease-out forwards", background: "rgba(0,0,0,0.7)", borderRadius: 99, padding: "6px 10px", gap: 2, backdropFilter: "blur(4px)" },
  reactionEmoji: { fontSize: 24 },
  reactionName: { fontSize: 10, color: "#a0a6b0" },
  sidebar: { width: 300, borderLeft: "1px solid rgba(255,255,255,0.07)", background: "#161a1e", display: "flex", flexDirection: "column", flexShrink: 0 },
  tabs: { display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 4px" },
  tab: { flex: 1, padding: "12px 4px", textAlign: "center", fontSize: 12, fontWeight: 500, color: "#7c8490", cursor: "pointer", border: "none", background: "transparent", borderBottom: "2px solid transparent", marginBottom: -1, transition: "all 0.15s", fontFamily: "inherit" },
  tabActive: { color: "#3b82f6", borderBottomColor: "#3b82f6" },
  errorPage: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0f11", fontFamily: "'DM Sans', sans-serif" },
  errorCard: { background: "#161a1e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, maxWidth: 400 },
  retryBtn: { background: "#3b82f6", border: "none", color: "#fff", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600 },
};
