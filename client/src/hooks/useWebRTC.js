import { useEffect, useRef, useState, useCallback } from "react";
import SimplePeer from "simple-peer";

let cachedIceServers = null;
let cacheExpiry = 0;

async function fetchIceServers(token) {
  const now = Date.now();
  if (cachedIceServers && now < cacheExpiry) return cachedIceServers;
  const FALLBACK = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  try {
    const res = await fetch("/api/auth/ice-servers", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return FALLBACK;
    const data = await res.json();
    cachedIceServers = data.iceServers || FALLBACK;
    cacheExpiry = now + 12 * 60 * 60 * 1000;
    return cachedIceServers;
  } catch { return FALLBACK; }
}

export const useWebRTC = ({ socket, roomId, localStream, token }) => {
  const peersRef = useRef(new Map());
  const [peers, setPeers] = useState([]);
  const iceServersRef = useRef([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]);

  const localStreamRef = useRef(localStream);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  useEffect(() => {
    if (!token) return;
    fetchIceServers(token).then(servers => { iceServersRef.current = servers; });
  }, [token]);

  const syncPeers = () => {
    setPeers([...peersRef.current.entries()].map(([socketId, data]) => ({
      socketId, stream: data.stream, name: data.name, avatarColor: data.avatarColor,
      audioEnabled: data.audioEnabled, videoEnabled: data.videoEnabled,
    })));
  };

  const createPeer = useCallback((targetSocketId, initiator, userData) => {
    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream: localStreamRef.current,
      config: { iceServers: iceServersRef.current },
    });

    peer.on("signal", (signalData) => {
      if (signalData.type === "offer") socket.current?.emit("offer", { targetSocketId, offer: signalData });
      else if (signalData.type === "answer") socket.current?.emit("answer", { targetSocketId, answer: signalData });
      else socket.current?.emit("ice-candidate", { targetSocketId, candidate: signalData });
    });

    peer.on("stream", (remoteStream) => {
      peersRef.current.set(targetSocketId, { ...peersRef.current.get(targetSocketId), stream: remoteStream });
      syncPeers();
    });

    peer.on("connect", () => {
      const pc = peer._pc;
      if (!pc) return;
      const videoSender = pc.getSenders().find(s => s.track?.kind === "video");
      const audioSender = pc.getSenders().find(s => s.track?.kind === "audio");
      const entry = peersRef.current.get(targetSocketId);
      if (entry) {
        entry.videoSender = videoSender || null;
        entry.audioSender = audioSender || null;
      }
    });

    peer.on("error", (err) => {
      console.error(`Peer error with ${targetSocketId}:`, err.message);
      removePeer(targetSocketId);
    });
    peer.on("close", () => removePeer(targetSocketId));

    peersRef.current.set(targetSocketId, {
      peer, stream: null, name: userData?.name || "Unknown",
      avatarColor: userData?.avatarColor || "#6c63ff",
      audioEnabled: true, videoEnabled: true, videoSender: null, audioSender: null,
    });

    syncPeers();
    return peer;
  }, [socket]); // <-- localStream REMOVED from deps. This is the fix.

  const removePeer = useCallback((socketId) => {
    const entry = peersRef.current.get(socketId);
    if (entry) { entry.peer.destroy(); peersRef.current.delete(socketId); syncPeers(); }
  }, []);

  useEffect(() => {
    if (!socket.current || !roomId) return;
    const sock = socket.current;

    const handleRoomUsers = (users) => {
      users.forEach(u => { if (!peersRef.current.has(u.socketId)) createPeer(u.socketId, true, u); });
    };
    const handleUserJoined = (u) => {
      if (!peersRef.current.has(u.socketId)) createPeer(u.socketId, false, u);
    };
    const handleOffer = ({ fromSocketId, fromName, offer }) => {
      let entry = peersRef.current.get(fromSocketId);
      if (!entry) { createPeer(fromSocketId, false, { name: fromName }); entry = peersRef.current.get(fromSocketId); }
      entry?.peer.signal(offer);
    };
    const handleAnswer = ({ fromSocketId, answer }) => peersRef.current.get(fromSocketId)?.peer.signal(answer);
    const handleIceCandidate = ({ fromSocketId, candidate }) => peersRef.current.get(fromSocketId)?.peer.signal(candidate);
    const handleUserLeft = ({ socketId }) => removePeer(socketId);
    const handleMediaState = ({ socketId, audio, video }) => {
      const entry = peersRef.current.get(socketId);
      if (entry) { entry.audioEnabled = audio; entry.videoEnabled = video; syncPeers(); }
    };

    sock.on("room-users", handleRoomUsers);
    sock.on("user-joined", handleUserJoined);
    sock.on("offer", handleOffer);
    sock.on("answer", handleAnswer);
    sock.on("ice-candidate", handleIceCandidate);
    sock.on("user-left", handleUserLeft);
    sock.on("user-media-state", handleMediaState);

    return () => {
      sock.off("room-users", handleRoomUsers);
      sock.off("user-joined", handleUserJoined);
      sock.off("offer", handleOffer);
      sock.off("answer", handleAnswer);
      sock.off("ice-candidate", handleIceCandidate);
      sock.off("user-left", handleUserLeft);
      sock.off("user-media-state", handleMediaState);
    };

  }, [socket, roomId, createPeer, removePeer]);

  const hasCreatedInitialPeers = useRef(false);
  useEffect(() => {
    if (!localStream || hasCreatedInitialPeers.current) return;
    hasCreatedInitialPeers.current = true;
    // localStreamRef is already up to date by the time this runs
  }, [localStream]);

  const replaceTrack = useCallback((oldTrack, newTrack) => {
    peersRef.current.forEach((entry, socketId) => {
      const { peer, videoSender } = entry;
      let sender = videoSender;

      if (!sender || sender.track === null) {
        const pc = peer._pc;
        sender = pc?.getSenders().find(s => s.track?.kind === (newTrack?.kind || "video"));
        if (sender) entry.videoSender = sender;
      }

      if (sender) {
        sender.replaceTrack(newTrack)
          .then(() => console.log(`[WebRTC] replaceTrack succeeded for ${socketId}`))
          .catch(err => console.error(`[WebRTC] replaceTrack failed for ${socketId}:`, err.message));
      } else {
        console.warn(`[WebRTC] No video sender found for peer ${socketId}`);
      }
    });
  }, []);

  const destroyAll = useCallback(() => {
    peersRef.current.forEach(({ peer }) => peer.destroy());
    peersRef.current.clear();
    setPeers([]);
  }, []);

  return { peers, replaceTrack, destroyAll, removePeer };
};