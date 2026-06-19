import { useEffect, useRef, useState, useCallback } from "react";

const COLORS = [
  { hex: "#ffffff", label: "White" },
  { hex: "#6c63ff", label: "Purple" },
  { hex: "#10d9a0", label: "Teal" },
  { hex: "#ff4d6d", label: "Red" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#ec4899", label: "Pink" },
  { hex: "#000000", label: "Black" },
];

const BRUSHES = [
  { size: 2,  label: "Fine" },
  { size: 5,  label: "Medium" },
  { size: 10, label: "Thick" },
  { size: 18, label: "Bold" },
];

export default function Whiteboard({ socket, roomId, onClose }) {
  const canvasRef   = useRef(null);
  const fabricRef   = useRef(null);
  const isRemoteRef = useRef(false);
  const pendingRef  = useRef([]);

  const [tool,        setTool]        = useState("pen");
  const [color,       setColor]       = useState("#ffffff");
  const [brushSize,   setBrush]       = useState(5);
  const [objectCount, setObjectCount] = useState(0);

  // ── Init Fabric ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fabric = window.fabric;
    if (!fabric || !canvasRef.current) return;

    const parent = canvasRef.current.parentElement;
    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode:   true,
      backgroundColor: "#0c0f18",
      width:           parent.clientWidth,
      height:          parent.clientHeight,
    });

    canvas.freeDrawingBrush.color = "#ffffff";
    canvas.freeDrawingBrush.width = 5;
    fabricRef.current = canvas;

    // Drain any events that arrived before canvas was ready
    if (pendingRef.current.length > 0) {
      pendingRef.current.forEach(event => applyRemoteEvent(canvas, fabric, event));
      pendingRef.current = [];
    }

    // Broadcast local strokes
    canvas.on("path:created", ({ path }) => {
      if (isRemoteRef.current) return;
      const data = path.toJSON();
      socket.current?.emit("whiteboard-event", {
        roomId,
        event: { type: "path:created", data },
      });
      setObjectCount(c => c + 1);
    });

    const onResize = () => {
      canvas.setWidth(parent.clientWidth);
      canvas.setHeight(parent.clientHeight);
      canvas.renderAll();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // ── Remote event handler (stable across renders) ───────────────────────────
  function applyRemoteEvent(canvas, fabric, event) {
    if (event.type === "path:created") {
      isRemoteRef.current = true;
      fabric.Path.fromObject(event.data, (path) => {
        canvas.add(path);
        canvas.renderAll();
        setObjectCount(c => c + 1);
        isRemoteRef.current = false;
      });
    } else if (event.type === "clear") {
      isRemoteRef.current = true;
      canvas.clear();
      canvas.backgroundColor = "#0c0f18";
      canvas.renderAll();
      setObjectCount(0);
      isRemoteRef.current = false;
    }
  }
  
  useEffect(() => {
    const sock = socket.current;
    if (!sock) return;

    const handleRemote = ({ event }) => {
      const canvas = fabricRef.current;
      const fabric = window.fabric;
      if (!canvas || !fabric) {
        // Queue until canvas is ready
        pendingRef.current.push(event);
        return;
      }
      applyRemoteEvent(canvas, fabric, event);
    };

    sock.on("whiteboard-event", handleRemote);
    return () => sock.off("whiteboard-event", handleRemote);
  }, [socket.current]);

  // ── Sync tool/color/brush to canvas ───────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (tool === "select") {
      canvas.isDrawingMode = false;
    } else if (tool === "eraser") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = "#0c0f18";
      canvas.freeDrawingBrush.width = brushSize * 3;
    } else {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushSize;
    }
  }, [tool, color, brushSize]);

  const clear = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#0c0f18";
    canvas.renderAll();
    setObjectCount(0);
    socket.current?.emit("whiteboard-event", { roomId, event: { type: "clear" } });
  }, [socket, roomId]);

  const undo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = canvas.getObjects();
    if (objs.length > 0) {
      canvas.remove(objs[objs.length - 1]);
      setObjectCount(c => c - 1);
    }
  }, []);

  return (
    <div style={s.container}>
      <div style={s.toolbar}>
        <div style={s.toolGroup}>
          {[
            { id: "pen",    icon: "✏️", label: "Draw"   },
            { id: "eraser", icon: "◻",  label: "Erase"  },
            { id: "select", icon: "↖",  label: "Select" },
          ].map(t => (
            <ToolBtn key={t.id} icon={t.icon} label={t.label}
              active={tool === t.id} onClick={() => setTool(t.id)} />
          ))}
        </div>
        <div style={s.sep} />
        <div style={s.colorRow}>
          {COLORS.map(c => (
            <button key={c.hex} title={c.label}
              style={{
                ...s.colorBtn,
                background:  c.hex,
                transform:   color === c.hex && tool === "pen" ? "scale(1.3)" : "scale(1)",
                boxShadow:   color === c.hex && tool === "pen"
                  ? `0 0 0 2px rgba(255,255,255,0.25), 0 0 8px ${c.hex}88` : "none",
              }}
              onClick={() => { setColor(c.hex); setTool("pen"); }}
            />
          ))}
        </div>
        <div style={s.sep} />
        <div style={s.toolGroup}>
          {BRUSHES.map(b => (
            <button key={b.size}
              style={{ ...s.sizeBtn, ...(brushSize === b.size ? s.sizeBtnActive : {}) }}
              onClick={() => setBrush(b.size)} title={b.label}
            >
              <div style={{ width: Math.min(b.size + 2, 16), height: Math.min(b.size + 2, 16), borderRadius: "50%", background: tool === "pen" ? color : "rgba(255,255,255,0.3)" }} />
            </button>
          ))}
        </div>
        <div style={s.sep} />
        <div style={s.toolGroup}>
          <ToolBtn icon="↩" label="Undo"  onClick={undo}  disabled={objectCount === 0} />
          <ToolBtn icon="🗑" label="Clear" onClick={clear} disabled={objectCount === 0} />
        </div>
        <div style={{ flex: 1 }} />
        {objectCount > 0 && (
          <div style={s.countChip}>{objectCount} stroke{objectCount !== 1 ? "s" : ""}</div>
        )}
        <button style={s.closeBtn} onClick={onClose}>✕ Close board</button>
      </div>
      <div style={s.canvasWrap}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function ToolBtn({ icon, label, active, onClick, disabled }) {
  return (
    <button
      style={{ ...s.toolBtn, ...(active ? s.toolBtnActive : {}), ...(disabled ? s.toolBtnDisabled : {}) }}
      onClick={onClick} disabled={disabled} title={label}
    >
      {icon}
    </button>
  );
}

const s = {
  container:      { position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#0c0f18", borderRadius: 14, overflow: "hidden", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.08)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" },
  toolbar:        { display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", background: "rgba(6,8,16,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, minHeight: 52, flexWrap: "wrap" },
  toolGroup:      { display: "flex", alignItems: "center", gap: 2 },
  sep:            { width: 1, height: 24, background: "rgba(255,255,255,0.06)", margin: "0 4px" },
  toolBtn:        { width: 30, height: 30, borderRadius: 8, borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)", background: "transparent", color: "#626880", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", fontFamily: "inherit" },
  toolBtnActive:  { background: "rgba(108,99,255,0.2)", borderColor: "rgba(108,99,255,0.4)", color: "#a78bfa" },
  toolBtnDisabled:{ opacity: 0.3, cursor: "not-allowed" },
  colorRow:       { display: "flex", alignItems: "center", gap: 5 },
  colorBtn:       { width: 18, height: 18, borderRadius: "50%", border: "none", cursor: "pointer", transition: "all 0.15s", flexShrink: 0 },
  sizeBtn:        { width: 30, height: 30, borderRadius: 8, borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" },
  sizeBtnActive:  { background: "rgba(108,99,255,0.15)", borderColor: "rgba(108,99,255,0.35)" },
  countChip:      { fontSize: 11, color: "#3d4258", background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "3px 9px", fontFamily: "'DM Mono', monospace" },
  closeBtn:       { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,77,109,0.1)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,77,109,0.2)", borderRadius: 8, color: "#ff6b8a", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  canvasWrap:     { flex: 1, overflow: "hidden" },
};
