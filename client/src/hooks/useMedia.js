import { useState, useEffect, useRef, useCallback } from "react";

export const useMedia = () => {
  const [localStream,     setLocalStream]     = useState(null);
  const [screenStream,    setScreenStream]    = useState(null);
  const [audioEnabled,    setAudioEnabled]    = useState(true);
  const [videoEnabled,    setVideoEnabled]    = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [mediaError,      setMediaError]      = useState(null);

  // Refs hold the live values — never go stale inside callbacks
  const cameraStreamRef    = useRef(null);
  const screenStreamRef    = useRef(null);
  const localVideoRef      = useRef(null);
  const origCamTrackRef    = useRef(null); // original camera video track

  // ── Start camera + mic ────────────────────────────────────────────────────
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });

      origCamTrackRef.current  = stream.getVideoTracks()[0];
      cameraStreamRef.current  = stream;

      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      setMediaError(null);
      return stream;
    } catch (err) {
      const msg =
        err.name === "NotAllowedError" ? "Camera/microphone permission denied. Please allow access and reload."
        : err.name === "NotFoundError" ? "No camera or microphone found."
        : `Media error: ${err.message}`;
      setMediaError(msg);
      return null;
    }
  }, []);

  // ── Toggle mic ────────────────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    const track = cameraStreamRef.current?.getAudioTracks()[0];
    if (!track) return true;
    track.enabled = !track.enabled;
    setAudioEnabled(track.enabled);
    return track.enabled;
  }, []);

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    const track = cameraStreamRef.current?.getVideoTracks()[0];
    if (!track) return true;
    track.enabled = !track.enabled;
    setVideoEnabled(track.enabled);
    return track.enabled;
  }, []);

  // ── Start screen share ────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true,
      });

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setIsSharingScreen(true);

      // When user clicks browser's native "Stop sharing" button
      displayStream.getVideoTracks()[0].onended = () => {
        stopScreenShareInternal();
      };

      return displayStream;
    } catch (err) {
      if (err.name !== "NotAllowedError") setMediaError(`Screen share error: ${err.message}`);
      return null;
    }
  }, []);

  // what React state says.
  const stopScreenShareInternal = useCallback(() => {
    const sStream = screenStreamRef.current;
    if (sStream) {
      sStream.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsSharingScreen(false);

    const origTrack = origCamTrackRef.current;
    if (!origTrack) return null;

    if (origTrack.readyState === "ended") {
      console.warn("[Media] Original cam track ended, restarting media");
      startMedia();
      return null;
    }

    origTrack.enabled = true;

    const camStream   = cameraStreamRef.current;
    const audioTracks = camStream ? camStream.getAudioTracks() : [];
    const freshStream = new MediaStream([origTrack, ...audioTracks]);

    cameraStreamRef.current = freshStream;
    setLocalStream(freshStream);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = freshStream;
      localVideoRef.current.play().catch(() => {});
    }

    return origTrack;
  }, [startMedia]);

  // Public stopScreenShare — same as internal, exposed to Room.jsx
  const stopScreenShare = useCallback(() => {
    return stopScreenShareInternal();
  }, [stopScreenShareInternal]);

  const stopAllTracks = useCallback(() => {
    // Stop camera stream (from ref — always current)
    cameraStreamRef.current?.getTracks().forEach(t => {
      t.stop();
      console.log(`[Media] Stopped track: ${t.kind} (${t.label})`);
    });

    // Stop screen stream (from ref — always current)
    screenStreamRef.current?.getTracks().forEach(t => t.stop());

    // Release video element — this is what turns off the camera LED
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    // Clear refs
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    origCamTrackRef.current = null;

    // Clear state
    setLocalStream(null);
    setScreenStream(null);
    setIsSharingScreen(false);
    setAudioEnabled(true);
    setVideoEnabled(true);
  }, []);

  // Safety net: stop tracks if component unmounts without explicit cleanup
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    };
  }, []);

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
    stopAllTracks,
  };
};