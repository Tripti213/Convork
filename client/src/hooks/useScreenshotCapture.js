import { useRef, useState, useCallback } from "react";

// ─── Compress an image to keep notes from bloating the database ───────────
function compressImage(canvas, maxWidth = 1280, quality = 0.72) {
  let { width, height } = canvas;
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }
  const resized = document.createElement("canvas");
  resized.width = width;
  resized.height = height;
  resized.getContext("2d").drawImage(canvas, 0, 0, width, height);
  return resized.toDataURL("image/jpeg", quality);
}

export default function useScreenshotCapture() {
  const [capturing, setCapturing] = useState(false);
  const [pendingFrame, setPendingFrame] = useState(null); // canvas awaiting area-select
  const streamRef = useRef(null);

  // ─── Capture one frame from the screen-picker ──────────────────────────────
  const grabFrame = useCallback(async () => {
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "never" },
        audio: false,
      });
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const imageCapture = "ImageCapture" in window ? new ImageCapture(track) : null;

      let bitmap;
      if (imageCapture) {
        bitmap = await imageCapture.grabFrame();
      } else {
        // Fallback: draw a single video frame via a hidden <video> element
        bitmap = await grabFrameFallback(stream);
      }

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0);

      // Stop the screen capture stream immediately — we only needed one frame
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      return canvas;
    } catch (err) {
      setCapturing(false);
      if (err.name !== "NotAllowedError") {
        console.error("Screenshot capture failed:", err.message);
      }
      return null;
    }
  }, []);

  // ─── Full screen capture — returns a data URL directly ─────────────────────
  const captureFullScreen = useCallback(async () => {
    const canvas = await grabFrame();
    setCapturing(false);
    if (!canvas) return null;
    return compressImage(canvas);
  }, [grabFrame]);

  // ─── Area-select capture — returns the raw canvas for the user to crop ─────
  const captureForAreaSelect = useCallback(async () => {
    const canvas = await grabFrame();
    setCapturing(false);
    if (!canvas) return null;
    setPendingFrame(canvas);
    return canvas;
  }, [grabFrame]);

  // ─── Crop the pending frame to a selected rectangle ─────────────────────────
  const cropPendingFrame = useCallback((rectPercent) => {
    if (!pendingFrame) return null;
    const { x, y, width, height } = rectPercent; // all 0–1 fractions
    const sx = x * pendingFrame.width;
    const sy = y * pendingFrame.height;
    const sw = width * pendingFrame.width;
    const sh = height * pendingFrame.height;

    const cropped = document.createElement("canvas");
    cropped.width = sw;
    cropped.height = sh;
    cropped.getContext("2d").drawImage(pendingFrame, sx, sy, sw, sh, 0, 0, sw, sh);

    setPendingFrame(null);
    return compressImage(cropped);
  }, [pendingFrame]);

  const cancelAreaSelect = useCallback(() => setPendingFrame(null), []);

  return {
    capturing,
    pendingFrame,
    captureFullScreen,
    captureForAreaSelect,
    cropPendingFrame,
    cancelAreaSelect,
  };
}

// ─── Fallback frame-grab for browsers without ImageCapture (e.g. Safari) ───
function grabFrameFallback(stream) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.play().then(() => {
        // Wait one extra frame to ensure a real picture is painted
        requestAnimationFrame(() => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d").drawImage(video, 0, 0);
          resolve(canvas);
        });
      }).catch(reject);
    };
    video.onerror = reject;
  });
}
