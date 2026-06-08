import { useState, useEffect, useRef, useCallback } from "react";

export const useMedia = () => {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  const localVideoRef = useRef(null);
  const cameraStreamRef = useRef(null); // always holds the original camera stream

  // ─── Get user camera + mic ─────────────────────────────────────────────────
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });

      cameraStreamRef.current = stream; // save original camera stream
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      setMediaError(null);
      return stream;
    } catch (err) {
      const msg =
        err.name === "NotAllowedError"
          ? "Camera/microphone permission denied. Please allow access and reload."
          : err.name === "NotFoundError"
          ? "No camera or microphone found."
          : `Media error: ${err.message}`;
      setMediaError(msg);
      return null;
    }
  }, []);

  // ─── Toggle microphone ─────────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    const stream = cameraStreamRef.current;
    if (!stream) return true;
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setAudioEnabled(track.enabled);
      return track.enabled;
    }
    return true;
  }, []);

  // ─── Toggle camera ─────────────────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    const stream = cameraStreamRef.current;
    if (!stream) return true;
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVideoEnabled(track.enabled);
      return track.enabled;
    }
    return true;
  }, []);

  // ─── Start screen share ────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true,
      });

      setScreenStream(displayStream);
      setIsSharingScreen(true);

      // Handle browser's native "Stop sharing" button
      displayStream.getVideoTracks()[0].onended = () => {
        restoreCamera(displayStream);
      };

      return displayStream;
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        setMediaError(`Screen share error: ${err.message}`);
      }
      return null;
    }
  }, []);

  // ─── Restore camera after screen share stops ───────────────────────────────
  const restoreCamera = useCallback((displayStream) => {
    // Stop screen tracks
    displayStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setIsSharingScreen(false);

    const cameraStream = cameraStreamRef.current;
    if (!cameraStream) return null;

    const cameraTrack = cameraStream.getVideoTracks()[0];
    if (!cameraTrack) return null;

    // Make sure track is alive — if it died, restart media entirely
    if (cameraTrack.readyState === "ended") {
      startMedia();
      return null;
    }

    cameraTrack.enabled = true;

    // Force React to re-render VideoTile by setting a NEW stream object
    // that contains the same tracks — this is the key fix
    const freshStream = new MediaStream([
      cameraTrack,
      ...cameraStream.getAudioTracks(),
    ]);

    cameraStreamRef.current = freshStream;
    setLocalStream(freshStream); // new object reference = React re-renders

    // Re-attach to local video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = freshStream;
      localVideoRef.current.play().catch(() => {});
    }

    return cameraTrack;
  }, [startMedia]);

  // ─── Public stopScreenShare (called from Room.jsx) ─────────────────────────
  const stopScreenShare = useCallback((stream) => {
    return restoreCamera(stream || screenStream);
  }, [screenStream, restoreCamera]);

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStream?.getTracks().forEach((t) => t.stop());
    };
  }, [screenStream]);

  return {
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
  };
};