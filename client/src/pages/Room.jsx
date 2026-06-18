import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { useMedia } from "../hooks/useMedia";
import { useWebRTC } from "../hooks/useWebRTC";

import VideoTile from "../components/VideoTile";
import Controls from "../components/Controls";
import ChatPanel, { registerChatListener, clearCache } from "../components/ChatPanel";
import FilesPanel from "../components/FilesPanel";
import ParticipantsPanel from "../components/ParticipantsPanel";
import Whiteboard from "../components/Whiteboard";
import NotesPanel from "../components/NotesPanel";

export default function Room() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const roomName = searchParams.get("name") || "Meeting";
  const roomCode = searchParams.get("code") || "";

  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { socket, emit, on, disconnect } = useSocket(token);

  const {
    localStream, screenStream, localVideoRef,
    audioEnabled, videoEnabled, isSharingScreen,
    mediaError, startMedia, toggleAudio, toggleVideo,
    startScreenShare, stopScreenShare, stopAllTracks,
    setOnNativeStop,
  } = useMedia();

  const { peers, replaceTrack, destroyAll } = useWebRTC({ socket, roomId, localStream, token });

  const [sidebarTab, setSidebarTab] = useState("people");
  const [isWhiteboardOpen, setWhiteboard] = useState(false);
  const [pinnedSocketId, setPinned] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [mediaReady, setMediaReady] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);
  const [wasDenied, setWasDenied] = useState(false);
  const [isHostUser, setIsHostUser] = useState(false);
  const [wasRemoved, setWasRemoved] = useState(false);
  const [whiteboardOpenedBy, setWhiteboardOpenedBy] = useState(null);
  const hasStartedMedia = useRef(false);

  // ── Boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasStartedMedia.current) return;
    hasStartedMedia.current = true;
    startMedia().then(s => s && setMediaReady(true));
  }, []);

  useEffect(() => {
    if (mediaReady && socket.current) {
      emit("join-room", {
        roomId,
        avatarColor: user?.avatarColor,
        isCreator: searchParams.get("isHost") === "true",
      });
    }
  }, [mediaReady, socket.current]);

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Reactions ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = on("reaction", ({ name, emoji }) => {
      const id = Date.now() + Math.random();
      setReactions(p => [...p, { id, emoji, name }]);
      setTimeout(() => setReactions(p => p.filter(r => r.id !== id)), 2800);
    });
    return unsub;
  }, [on]);

  // ── Unread chat badge ────────────────────────────────────────────────────────
  useEffect(() => {
    const sock = socket.current;
    if (!sock) return;
    const handleMsg = () => {
      if (sidebarTab !== "chat") setUnreadChat(n => n + 1);
    };
    sock.on("chat-message", handleMsg);
    return () => sock.off("chat-message", handleMsg);
  }, [socket.current, sidebarTab]);

  useEffect(() => {
    if (sidebarTab === "chat") setUnreadChat(0);
  }, [sidebarTab]);

  useEffect(() => {
    const handlePopState = () => {
      destroyAll();
      localStream?.getTracks().forEach(t => t.stop());
      disconnect();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [localStream]);

  useEffect(() => {
    const unsubWaiting = on("waiting-for-admission", () => setIsWaiting(true));
    const unsubAdmitted = on("admitted", ({ isHost }) => {
      setIsWaiting(false);
      setIsHostUser(isHost);
    });
    const unsubDenied = on("admission-denied", () => setWasDenied(true));
    const unsubRemoved = on("removed-from-room", () => setWasRemoved(true));

    return () => {
      unsubWaiting();
      unsubAdmitted();
      unsubDenied();
      unsubRemoved();
    };
  }, [on]);

  useEffect(() => {
    if (!socket.current || !roomId) return;
    const unregister = registerChatListener(socket, roomId);
    return () => unregister();
  }, [socket.current, roomId]);

  useEffect(() => {
    const sock = socket.current;
    if (!sock) return;
    const handleWbOpen = ({ name }) => { setWhiteboardOpenedBy(name); setWhiteboard(true); };
    const handleWbClose = () => { setWhiteboardOpenedBy(null); setWhiteboard(false); };
    sock.on("whiteboard-opened", handleWbOpen);
    sock.on("whiteboard-closed", handleWbClose);
    return () => {
      sock.off("whiteboard-opened", handleWbOpen);
      sock.off("whiteboard-closed", handleWbClose);
    };
  }, [socket.current]);

  useEffect(() => {
    setOnNativeStop(() => {
      const screenVideoTrack = screenStream?.getVideoTracks()[0];
      const restoredTrack = stopScreenShare();
      if (screenVideoTrack && restoredTrack) {
        replaceTrack(screenVideoTrack, restoredTrack);
      }
      emit("screen-share-stopped", { roomId });
      emit("media-state", { roomId, audio: audioEnabled, video: videoEnabled });
    });
  }, [screenStream, audioEnabled, videoEnabled, roomId]);

  // ── Screen share ─────────────────────────────────────────────────────────────
  const handleToggleScreen = useCallback(async () => {
    if (isSharingScreen) {
      const screenVideoTrack = screenStream?.getVideoTracks()[0];
      console.log("[DEBUG] screenVideoTrack captured:", screenVideoTrack);

      const restoredTrack = stopScreenShare();
      console.log("[DEBUG] restoredTrack returned:", restoredTrack);

      if (screenVideoTrack && restoredTrack) {
        console.log("[DEBUG] Calling replaceTrack NOW");
        replaceTrack(screenVideoTrack, restoredTrack);
      } else {
        console.error("[DEBUG] SKIPPED replaceTrack! screenVideoTrack:", screenVideoTrack, "restoredTrack:", restoredTrack);
      }

      emit("screen-share-stopped", { roomId });
      emit("media-state", { roomId, audio: audioEnabled, video: videoEnabled });

    } else {
      const displayStream = await startScreenShare();
      if (displayStream) {
        const screenTrack = displayStream.getVideoTracks()[0];
        const localVidTrack = localStream?.getVideoTracks()[0];
        if (localVidTrack) replaceTrack(localVidTrack, screenTrack);
        emit("screen-share-started", { roomId });
        emit("media-state", { roomId, audio: audioEnabled, video: true });
      }
    }
  }, [isSharingScreen, screenStream, localStream, roomId, audioEnabled, videoEnabled]);

  const handleToggleAudio = () => {
    const e = toggleAudio();
    emit("media-state", { roomId, audio: e, video: videoEnabled });
  };

  const handleToggleVideo = () => {
    const e = toggleVideo();
    emit("media-state", { roomId, audio: audioEnabled, video: e });
  };

  const handleLeave = () => {
    destroyAll();
    stopAllTracks();
    disconnect();
    clearCache(roomId);
    navigate("/dashboard", { replace: true });
  };

  const handleReaction = (emoji) => emit("reaction", { roomId, emoji });

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const totalTiles = peers.length + 1;
  const gridCols = totalTiles <= 1 ? 1 : totalTiles <= 4 ? 2 : 3;

  // ── Media error screen ───────────────────────────────────────────────────────
  if (mediaError) return (
    <div style={s.errorPage}>
      <div style={s.errorBg1} />
      <div style={s.errorBg2} />
      <div style={s.errorCard}>
        <div style={s.errorIcon}>📷</div>
        <h2 style={s.errorTitle}>Camera / Mic Required</h2>
        <p style={s.errorDesc}>{mediaError}</p>
        <button style={s.retryBtn} onClick={() => window.location.reload()}>
          Try again →
        </button>
      </div>
    </div>
  );

  if (isWaiting) {
    return (
      <div style={s.errorPage}>
        <div style={s.errorBg1} />
        <div style={s.errorCard}>
          <div style={{ ...s.errorIcon, animation: "pulse-glow 2s infinite" }}>⏳</div>
          <h2 style={s.errorTitle}>Waiting for host</h2>
          <p style={s.errorDesc}>
            The host has been notified. You'll join automatically once admitted.
          </p>
        </div>
      </div>
    );
  }

  if (wasDenied) {
    return (
      <div style={s.errorPage}>
        <div style={s.errorBg2} />
        <div style={s.errorCard}>
          <div style={s.errorIcon}>🚫</div>
          <h2 style={s.errorTitle}>Access denied</h2>
          <p style={s.errorDesc}>The host didn't admit you to this meeting.</p>
          <button style={s.retryBtn} onClick={() => navigate("/dashboard", { replace: true })}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (wasRemoved) {
    return (
      <div style={s.errorPage}>
        <div style={s.errorBg2} />
        <div style={s.errorCard}>
          <div style={s.errorIcon}>👋</div>
          <h2 style={s.errorTitle}>Removed from meeting</h2>
          <p style={s.errorDesc}>The host removed you from this call.</p>
          <button style={s.retryBtn} onClick={() => navigate("/dashboard", { replace: true })}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* ── Subtle room background ── */}
      <div style={s.roomBg}>
        <div style={s.bgGlow1} />
        <div style={s.bgGlow2} />
        <div style={s.bgGrid} />
        {/* Corner geometric accents */}
        <svg style={s.cornerGeo} viewBox="0 0 400 300" preserveAspectRatio="xMaxYMin meet">
          <polygon points="320,20 370,-10 420,20 420,80 370,110 320,80" fill="none" stroke="rgba(108,99,255,0.08)" strokeWidth="1" style={{ animation: "geo-spin 50s linear infinite", transformOrigin: "370px 50px" }} />
          <circle cx="380" cy="200" r="50" fill="none" stroke="rgba(167,139,250,0.05)" strokeWidth="1" strokeDasharray="8 6" style={{ animation: "geo-spin 35s linear infinite reverse" }} />
        </svg>
        <svg style={s.cornerGeo2} viewBox="0 0 400 300" preserveAspectRatio="xMinYMax meet">
          <polygon points="20,200 70,172 120,200 120,256 70,284 20,256" fill="none" stroke="rgba(16,217,160,0.07)" strokeWidth="1" style={{ animation: "geo-spin 44s linear infinite reverse", transformOrigin: "70px 228px" }} />
          <polygon points="160,240 200,210 240,240 200,270" fill="none" stroke="rgba(108,99,255,0.06)" strokeWidth="1" style={{ animation: "geo-float 10s ease-in-out infinite" }} />
        </svg>
      </div>

      {/* ── Top bar ── */}
      <header style={s.topbar}>
        {/* Left */}
        <div style={s.topLeft}>
          <div style={s.brandMark}>
            <ConvorkMark size={22} />
          </div>
          <span style={s.brandName}>Convork</span>
          <div style={s.topDivider} />
          <div style={s.roomChip}>
            <span style={s.liveRing} />
            <span style={s.roomChipName}>{roomName}</span>
          </div>
        </div>

        {/* Center */}
        <div style={s.topCenter}>
          <div style={s.timerPill}>
            <span style={s.timerRecDot} />
            <span style={s.timerVal}>{formatTime(elapsed)}</span>
          </div>
        </div>

        {/* Right */}
        <div style={s.topRight}>
          {/* Participants count */}
          <div style={s.peerCount}>
            <span style={s.peerDot} />
            <span>{peers.length + 1}</span>
          </div>

          {/* Room code copy */}
          <button
            style={{ ...s.codeBtn, ...(codeCopied ? s.codeBtnDone : {}) }}
            onClick={copyCode}
          >
            <span style={s.codeMono}>{roomCode}</span>
            <span style={s.codeIcon}>{codeCopied ? "✓" : "⎘"}</span>
          </button>

          {/* Screen sharing indicator */}
          {isSharingScreen && (
            <div style={s.sharingBadge}>
              <span style={s.sharingDot} />
              Sharing
            </div>
          )}
        </div>
      </header>

      {/* ── Main layout ── */}
      <div style={s.main}>

        {/* ── Video area ── */}
        <div style={s.videoArea}>

          {/* Whiteboard overlay */}
          {isWhiteboardOpen && (
            <div style={s.wbOverlay}>
              <Whiteboard
                socket={socket}
                roomId={roomId}
                onClose={() => setWhiteboard(false)}
              />
            </div>
          )}

          {/* Video grid */}
          <div style={{
            ...s.videoGrid,
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          }}>
            {/* Local tile */}
            <VideoTile
              stream={localStream}
              name={user?.name}
              avatarColor={user?.avatarColor || "#6c63ff"}
              isLocal
              isMuted={!audioEnabled}
              isCamOff={!videoEnabled}
              isPinned={pinnedSocketId === "local"}
              onPin={() => setPinned(pinnedSocketId === "local" ? null : "local")}
            />

            {/* Remote peers */}
            {peers.map(peer => (
              <VideoTile
                key={peer.socketId}
                stream={peer.stream}
                name={peer.name}
                avatarColor={peer.avatarColor}
                isMuted={peer.audioEnabled === false}
                isCamOff={peer.videoEnabled === false}
                isPinned={pinnedSocketId === peer.socketId}
                onPin={() => setPinned(pinnedSocketId === peer.socketId ? null : peer.socketId)}
              />
            ))}
          </div>

          {/* Floating reactions */}
          {reactions.length > 0 && (
            <div style={s.reactionsWrap}>
              {reactions.map(r => (
                <div key={r.id} style={s.reactionItem}>
                  <div style={s.reactionBubble}>
                    <span style={s.reactionEmoji}>{r.emoji}</span>
                  </div>
                  <span style={s.reactionName}>{r.name}</span>
                </div>
              ))}
            </div>
          )}


        </div>

        {/* Floating Overlaid Controls */}
        <div style={s.controlsWrapper}>
          <Controls
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            isSharingScreen={isSharingScreen}
            isWhiteboardOpen={isWhiteboardOpen}
            onToggleAudio={handleToggleAudio}
            onToggleVideo={handleToggleVideo}
            onToggleScreen={handleToggleScreen}
            onToggleWhiteboard={() => {
              const next = !isWhiteboardOpen;
              setWhiteboard(next);
              socket.current?.emit(next ? "whiteboard-opened" : "whiteboard-closed", { roomId, name: user?.name });
            }}
            onReaction={handleReaction}
            onLeave={handleLeave}
          />
        </div>

        {/* ── Sidebar ── */}
        <aside style={s.sidebar}>
          {/* Tabs */}
          <div style={s.sidebarTabs}>
            {[
              { id: "people", icon: "👥", label: "People", count: peers.length + 1 },
              { id: "chat", icon: "💬", label: "Chat", badge: unreadChat },
              { id: "files", icon: "📁", label: "Files" },
              { id: "notes", icon: "📝", label: "Notes" },
            ].map(({ id, icon, label, count, badge }) => (
              <button
                key={id}
                style={{ ...s.sidebarTab, ...(sidebarTab === id ? s.sidebarTabActive : {}) }}
                onClick={() => setSidebarTab(id)}
              >
                <span style={s.tabIcon}>{icon}</span>
                <span>{label}</span>
                {count !== undefined && (
                  <span style={s.tabCountBadge}>{count}</span>
                )}
                {badge > 0 && (
                  <span style={s.tabUnreadBadge}>{badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Panel */}
          <div style={s.sidebarPanel}>
            {sidebarTab === "people" && (
              <ParticipantsPanel
                peers={peers}
                localUser={user}
                socket={socket}
                roomId={roomId}
                isHost={isHostUser}
              />
            )}
            {sidebarTab === "chat" && (
              <ChatPanel socket={socket} roomId={roomId} user={user} />
            )}
            {sidebarTab === "files" && (
              <FilesPanel socket={socket} roomId={roomId} token={token} />
            )}
            {sidebarTab === "notes" && (
              <NotesPanel roomId={roomId} token={token} />
            )}
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes geo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes geo-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes float-reaction {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-90px) scale(1.1); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Convork icon (inline so Room is self-contained) ───────────────────────────
function ConvorkMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="url(#rmg)" />
      <rect x="5" y="10" width="14" height="12" rx="3" fill="white" opacity="0.9" />
      <polygon points="19,13 27,9 27,23 19,19" fill="white" opacity="0.7" />
      <circle cx="12" cy="16" r="3" fill="url(#rmg2)" />
      <defs>
        <linearGradient id="rmg" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#6c63ff" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="rmg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10d9a0" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────#060810
const s = {
  // Layout
  page: { height: "100vh", display: "flex", flexDirection: "column", background: "#060810", fontFamily: "'DM Sans', sans-serif", color: "#eef0f6", overflow: "hidden", position: "relative" },

  // Background
  roomBg: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" },
  bgGlow1: { position: "absolute", top: "-10%", left: "15%", width: "50vw", height: "40vh", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(108,99,255,0.06) 0%, transparent 70%)" },
  bgGlow2: { position: "absolute", bottom: "-5%", right: "20%", width: "40vw", height: "30vh", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(16,217,160,0.04) 0%, transparent 70%)" },
  bgGrid: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize: "64px 64px" },
  cornerGeo: { position: "absolute", top: 0, right: 0, width: 400, height: 300, opacity: 1 },
  cornerGeo2: { position: "absolute", bottom: 0, left: 0, width: 400, height: 300, opacity: 1 },

  // Top bar
  topbar: { position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", height: 54, borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(6,8,16,0.92)", backdropFilter: "blur(20px)", flexShrink: 0 },
  topLeft: { display: "flex", alignItems: "center", gap: 10, flex: 1 },
  brandMark: { display: "flex", alignItems: "center", flexShrink: 0 },
  brandName: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.05em", color: "#eef0f6" },
  topDivider: { width: 1, height: 16, background: "rgba(255,255,255,0.07)", margin: "0 4px" },
  roomChip: { display: "flex", alignItems: "center", gap: 7, background: "rgba(252, 242, 242, 0.04)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "4px 12px" },
  liveRing: { width: 6, height: 6, borderRadius: "50%", background: "#10d9a0", boxShadow: "0 0 8px rgba(16,217,160,0.8)", animation: "pulse-glow 2s ease-in-out infinite" },
  roomChipName: { fontSize: 12, fontWeight: 600, color: "#a0a6b8" },

  topCenter: { display: "flex", justifyContent: "center", flex: 1 },
  timerPill: { display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "5px 14px" },
  timerRecDot: { width: 5, height: 5, borderRadius: "50%", background: "#ff4d6d", animation: "pulse-glow 1.5s ease-in-out infinite" },
  timerVal: { fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#626880", letterSpacing: "0.08em" },

  topRight: { display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" },
  peerCount: { display: "flex", alignItems: "center", gap: 5, background: "rgba(108,99,255,0.1)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(108,99,255,0.2)", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: "#a78bfa" },
  peerDot: { width: 5, height: 5, borderRadius: "50%", background: "#a78bfa" },
  codeBtn: { display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.04)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "4px 12px", cursor: "pointer", color: "#626880", transition: "all 0.2s" },
  codeBtnDone: { borderColor: "rgba(16,217,160,0.4)", color: "#10d9a0", background: "rgba(16,217,160,0.06)" },
  codeMono: { fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.1em" },
  codeIcon: { fontSize: 12 },
  sharingBadge: { display: "flex", alignItems: "center", gap: 6, background: "rgba(16,217,160,0.1)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(16,217,160,0.3)", borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#10d9a0" },
  sharingDot: { width: 5, height: 5, borderRadius: "50%", background: "#10d9a0", animation: "pulse-glow 1s infinite" },

  // Main layout
  main: { flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 1 },

  // Video area
  videoArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "12px 14px 14px 14px", // Balanced padding on all sides
    overflow: "hidden",
    position: "relative"
  },
  controlsWrapper: {
    position: "absolute",
    bottom: 24,         // Floats it nicely above the bottom video edge
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 30,         // Keeps it layered safely above the streaming video tiles
    pointerEvents: "auto"
  },
  wbOverlay: { position: "absolute", inset: 0, zIndex: 50, borderRadius: 12, overflow: "hidden", margin: "0 10px 0 0" },
  videoGrid: { flex: 1, display: "grid", gap: 8, overflow: "hidden" },

  // Reactions
  reactionsWrap: { position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, pointerEvents: "none", zIndex: 20 },
  reactionItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5, animation: "float-reaction 2.8s ease-out forwards" },
  reactionBubble: { background: "rgba(10,13,22,0.88)", backdropFilter: "blur(12px)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "8px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" },
  reactionEmoji: { fontSize: 26 },
  reactionName: { fontSize: 10, color: "#626880", fontWeight: 600 },

  // Sidebar
  sidebar: { width: 288, borderLeft: "1px solid rgba(255,255,255,0.05)", background: "rgba(6,8,16,0.95)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", flexShrink: 0 },
  sidebarTabs: { display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "8px 6px 0", gap: 2 },
  sidebarTab: { flex: 1, padding: "9px 4px 10px", background: "transparent", border: "none", borderBottom: "2px solid transparent", color: "#626880", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.2s", fontFamily: "inherit", borderRadius: "8px 8px 0 0", position: "relative", letterSpacing: "0.02em" },
  sidebarTabActive: { color: "#a78bfa", borderBottomColor: "#6c63ff", background: "rgba(108,99,255,0.06)" },
  tabIcon: { fontSize: 16 },
  tabCountBadge: { position: "absolute", top: 6, right: 4, background: "rgba(108,99,255,0.25)", color: "#a78bfa", fontSize: 9, fontWeight: 800, borderRadius: 99, padding: "1px 5px", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(108,99,255,0.2)" },
  tabUnreadBadge: { position: "absolute", top: 5, right: 3, background: "#ff4d6d", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 99, padding: "1px 5px", minWidth: 16, textAlign: "center" },
  sidebarPanel: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" },

  // Error
  errorPage: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060810", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" },
  errorBg1: { position: "absolute", top: "20%", left: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)", pointerEvents: "none" },
  errorBg2: { position: "absolute", bottom: "20%", right: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,77,109,0.07) 0%, transparent 70%)", pointerEvents: "none" },
  errorCard: { position: "relative", zIndex: 1, background: "rgba(10,13,22,0.9)", backdropFilter: "blur(24px)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.07)", borderRadius: 20, padding: "44px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, maxWidth: 380, textAlign: "center", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" },
  errorIcon: { fontSize: 40, marginBottom: 4 },
  errorTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: "#eef0f6" },
  errorDesc: { fontSize: 14, color: "#626880", lineHeight: 1.6 },
  retryBtn: { background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none", color: "#fff", padding: "11px 28px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(108,99,255,0.4)", marginTop: 4 },
};
