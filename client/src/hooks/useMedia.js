import { useState, useEffect, useRef, useCallback } from "react";

export const useMedia = () => {
  const [localStream,     setLocalStream]     = useState(null);
  const [screenStream,    setScreenStream]    = useState(null);
  const [audioEnabled,    setAudioEnabled]    = useState(true);
  const [videoEnabled,    setVideoEnabled]    = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [mediaError,      setMediaError]      = useState(null);

  const cameraStreamRef    = useRef(null);
  const screenStreamRef    = useRef(null);
  const localVideoRef      = useRef(null);
  const origCamTrackRef    = useRef(null);

  const onNativeStopRef = useRef(null);
  const setOnNativeStop = useCallback((callback) => {
    onNativeStopRef.current = callback;
  }, []);

  const startMedia = useCallback(async () => {
    if (cameraStreamRef.current) {
      console.warn("[Media] startMedia called while a stream already exists — stopping old stream first");
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }

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

  const toggleAudio = useCallback(() => {
    const track = cameraStreamRef.current?.getAudioTracks()[0];
    if (!track) return true;
    track.enabled = !track.enabled;
    setAudioEnabled(track.enabled);
    return track.enabled;
  }, []);

  const toggleVideo = useCallback(() => {
    const track = cameraStreamRef.current?.getVideoTracks()[0];
    if (!track) return true;
    track.enabled = !track.enabled;
    setVideoEnabled(track.enabled);
    return track.enabled;
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true,
      });

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setIsSharingScreen(true);

      displayStream.getVideoTracks()[0].onended = () => {
        if (onNativeStopRef.current) {
          onNativeStopRef.current(); // delegate to Room.jsx's full stop logic
        } else {
          stopScreenShareInternal(); // fallback: at least fix local view
        }
      };

      return displayStream;
    } catch (err) {
      if (err.name !== "NotAllowedError") setMediaError(`Screen share error: ${err.message}`);
      return null;
    }
  }, []);

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

  const stopScreenShare = useCallback(() => {
    return stopScreenShareInternal();
  }, [stopScreenShareInternal]);

  const stopAllTracks = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach(t => {
      t.stop();
      console.log(`[Media] Stopped track: ${t.kind} (${t.label})`);
    });
    screenStreamRef.current?.getTracks().forEach(t => t.stop());

    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    origCamTrackRef.current = null;

    setLocalStream(null);
    setScreenStream(null);
    setIsSharingScreen(false);
    setAudioEnabled(true);
    setVideoEnabled(true);
  }, []);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    };
  }, []);

  return {
    localStream, screenStream, localVideoRef,
    audioEnabled, videoEnabled, isSharingScreen, mediaError,
    startMedia, toggleAudio, toggleVideo,
    startScreenShare, stopScreenShare, stopAllTracks,
    setOnNativeStop, 
  };
};