import { useState, useRef } from "react";

export default function AreaSelectOverlay({ canvas, onConfirm, onCancel }) {
  const [rect, setRect] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const wrapRef = useRef(null); // Bug fix: measure from the WRAPPER, not the <img>

  const dataUrl = canvas.toDataURL("image/png");

  // ── THE FIX ──────────────────────────────────────────────────────────────
  // Root cause: mouse coordinates were calculated relative to the <img>
  // element's bounding box, but the selectionBox overlay div is positioned
  // absolute relative to its PARENT (imageWrap), not relative to the <img>.
  // Because the <img> uses objectFit:"contain" inside a wrap that's
  // width:100%/height:100%, the image itself can be smaller than the wrap
  // (e.g. letterboxed with empty space on the sides if aspect ratios don't
  // match) — meaning the <img>'s bounding box and the wrap's bounding box
  // are NOT the same rectangle. Calculating from one and rendering relative
  // to the other caused the visible box to appear offset from the actual
  // drag position.
  //
  // Fix: always measure mouse position relative to wrapRef (the actual
  // positioning context for the absolute-positioned selectionBox), so the
  // numbers used for both calculation AND rendering come from the exact
  // same coordinate space.
  const getRelativePos = (e) => {
    const bounds = wrapRef.current.getBoundingClientRect();
    return {
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    };
  };

  const handleMouseDown = (e) => {
    const pos = getRelativePos(e);
    setDragStart(pos);
    setRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!dragStart) return;
    const pos = getRelativePos(e);
    setRect({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      width: Math.abs(pos.x - dragStart.x),
      height: Math.abs(pos.y - dragStart.y),
    });
  };

  const handleMouseUp = () => setDragStart(null);

  const confirmSelection = () => {
    if (!rect || rect.width < 10 || rect.height < 10) return;
    // Now we need the IMAGE's actual rendered bounds (not the wrap's) to
    // correctly convert pixel coordinates into 0-1 fractions of the real
    // image content — since objectFit:contain may letterbox the image
    // within the wrap. We get this via the img element directly here.
    const imgEl = wrapRef.current.querySelector("img");
    const imgBounds = imgEl.getBoundingClientRect();
    const wrapBounds = wrapRef.current.getBoundingClientRect();

    // Convert rect (relative to wrap) into coordinates relative to the
    // image's own rendered position within the wrap
    const imgOffsetX = imgBounds.left - wrapBounds.left;
    const imgOffsetY = imgBounds.top - wrapBounds.top;

    const relX = rect.x - imgOffsetX;
    const relY = rect.y - imgOffsetY;

    onConfirm({
      x: Math.max(0, relX / imgBounds.width),
      y: Math.max(0, relY / imgBounds.height),
      width: Math.min(1, rect.width / imgBounds.width),
      height: Math.min(1, rect.height / imgBounds.height),
    });
  };

  return (
    <div style={s.overlay}>
      <div style={s.toolbar}>
        <span style={s.toolbarText}>Drag to select an area</span>
        <div style={s.toolbarActions}>
          <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
          <button
            style={{ ...s.confirmBtn, ...(rect && rect.width > 10 ? {} : s.confirmBtnDisabled) }}
            onClick={confirmSelection}
            disabled={!rect || rect.width < 10}
          >
            Use selection ✓
          </button>
        </div>
      </div>

      <div style={s.imageArea}>
        <div
          ref={wrapRef}
          style={s.imageWrap}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <img src={dataUrl} alt="Screen capture" style={s.image} draggable={false} />
          {rect && (
            <div
              style={{
                ...s.selectionBox,
                left: rect.x, top: rect.y, width: rect.width, height: rect.height,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", flexDirection: "column" },
  toolbar: { flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", color: "#eef0f6" },
  toolbarText: { fontSize: 13, color: "#a0a6b8" },
  toolbarActions: { display: "flex", gap: 10 },
  cancelBtn: { padding: "8px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#c8ccd8", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  confirmBtn: { padding: "8px 16px", background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  confirmBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  imageArea: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px 24px", overflow: "hidden", minHeight: 0 },
  // imageWrap is now the SAME element that mouse events are measured
  // against AND the positioning context for selectionBox — single source
  // of truth for coordinates, eliminating the mismatch entirely
  imageWrap: { position: "relative", cursor: "crosshair", userSelect: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", maxWidth: "100%", maxHeight: "100%" },
  image: { maxWidth: "100%", maxHeight: "calc(100vh - 120px)", width: "auto", height: "auto", display: "block", borderRadius: 8, objectFit: "contain" },
  selectionBox: { position: "absolute", border: "2px solid #6c63ff", background: "rgba(108,99,255,0.15)", pointerEvents: "none" },
};