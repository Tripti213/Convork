import { useEffect, useRef, useState, useCallback } from "react";
import SimplePeer from "simple-peer";

// ICE servers — add your TURN credentials in .env
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Add TURN server for production:
  // {
  //   urls: import.meta.env.VITE_TURN_URL,
  //   username: import.meta.env.VITE_TURN_USERNAME,
  //   credential: import.meta.env.VITE_TURN_CREDENTIAL,
  // },
];

export const useWebRTC = ({ socket, roomId, localStream }) => {
  // peers: Map<socketId, { peer: SimplePeer, stream: MediaStream, name, avatarColor }>
  const peersRef = useRef(new Map());
  const [peers, setPeers] = useState([]); // array for rendering

  const syncPeers = () => {
    setPeers(
      [...peersRef.current.entries()].map(([socketId, data]) => ({
        socketId,
        stream: data.stream,
        name: data.name,
        avatarColor: data.avatarColor,
      }))
    );
  };

  // ─── Create a peer connection ─────────────────────────────────────────────
  const createPeer = useCallback(
    (targetSocketId, initiator, userData) => {
      const peer = new SimplePeer({
        initiator,
        trickle: true, // send ICE candidates as found
        stream: localStream,
        config: { iceServers: ICE_SERVERS },
      });

      // When we have an offer or answer to send
      peer.on("signal", (signalData) => {
        if (signalData.type === "offer") {
          socket.current?.emit("offer", { targetSocketId, offer: signalData });
        } else if (signalData.type === "answer") {
          socket.current?.emit("answer", { targetSocketId, answer: signalData });
        } else {
          // ICE candidate
          socket.current?.emit("ice-candidate", { targetSocketId, candidate: signalData });
        }
      });

      // When we receive remote stream
      peer.on("stream", (remoteStream) => {
        peersRef.current.set(targetSocketId, {
          ...peersRef.current.get(targetSocketId),
          stream: remoteStream,
        });
        syncPeers();
      });

      peer.on("error", (err) => {
        console.error(`Peer error with ${targetSocketId}:`, err.message);
        removePeer(targetSocketId);
      });

      peer.on("close", () => removePeer(targetSocketId));

      peersRef.current.set(targetSocketId, {
        peer,
        stream: null,
        name: userData?.name || "Unknown",
        avatarColor: userData?.avatarColor || "#3b82f6",
      });

      syncPeers();
      return peer;
    },
    [localStream, socket]
  );

  const removePeer = useCallback((socketId) => {
    const entry = peersRef.current.get(socketId);
    if (entry) {
      entry.peer.destroy();
      peersRef.current.delete(socketId);
      syncPeers();
    }
  }, []);

  // ─── Socket event handlers ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket.current || !localStream || !roomId) return;

    const sock = socket.current;

    // Server tells us who's already in the room — we initiate to each
    const handleRoomUsers = (users) => {
      users.forEach((userData) => {
        if (!peersRef.current.has(userData.socketId)) {
          createPeer(userData.socketId, true, userData);
        }
      });
    };

    // A new user joined — they will send us an offer, we just register them
    const handleUserJoined = (userData) => {
      if (!peersRef.current.has(userData.socketId)) {
        createPeer(userData.socketId, false, userData);
      }
    };

    // Received an offer — signal it into the peer
    const handleOffer = ({ fromSocketId, fromName, offer }) => {
      let entry = peersRef.current.get(fromSocketId);
      if (!entry) {
        createPeer(fromSocketId, false, { name: fromName });
        entry = peersRef.current.get(fromSocketId);
      }
      entry?.peer.signal(offer);
    };

    // Received an answer
    const handleAnswer = ({ fromSocketId, answer }) => {
      peersRef.current.get(fromSocketId)?.peer.signal(answer);
    };

    // Received ICE candidate
    const handleIceCandidate = ({ fromSocketId, candidate }) => {
      peersRef.current.get(fromSocketId)?.peer.signal(candidate);
    };

    // User left
    const handleUserLeft = ({ socketId }) => removePeer(socketId);

    sock.on("room-users", handleRoomUsers);
    sock.on("user-joined", handleUserJoined);
    sock.on("offer", handleOffer);
    sock.on("answer", handleAnswer);
    sock.on("ice-candidate", handleIceCandidate);
    sock.on("user-left", handleUserLeft);

    return () => {
      sock.off("room-users", handleRoomUsers);
      sock.off("user-joined", handleUserJoined);
      sock.off("offer", handleOffer);
      sock.off("answer", handleAnswer);
      sock.off("ice-candidate", handleIceCandidate);
      sock.off("user-left", handleUserLeft);
    };
  }, [socket, localStream, roomId, createPeer, removePeer]);

  // ─── Replace track on all peers (used for screen share) ──────────────────
  const replaceTrack = useCallback((oldTrack, newTrack) => {
    peersRef.current.forEach(({ peer }) => {
      const sender = peer._pc
        ?.getSenders()
        .find((s) => s.track?.kind === oldTrack.kind);
      if (sender) sender.replaceTrack(newTrack);
    });
  }, []);

  // ─── Cleanup all peers on unmount ─────────────────────────────────────────
  const destroyAll = useCallback(() => {
    peersRef.current.forEach(({ peer }) => peer.destroy());
    peersRef.current.clear();
    setPeers([]);
  }, []);

  return { peers, replaceTrack, destroyAll, removePeer };
};
