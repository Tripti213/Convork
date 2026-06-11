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
  { size: 2, label: "Fine" },
  { size: 5, label: "Medium" },
  { size: 10, label: "Thick" },
  { size: 18, label: "Bold" },
];

export default function Whiteboard({ socket, roomId, onClose }) {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const isRemote = useRef(false);

  const [tool, setTool]       = useState("pen");
  const [color, setColor]     = useState("#ffffff");
  const [brushSize, setBrush] = useState(5);
  const [objectCount, setObjectCount] = useState(0);

  // Init Fabric
  useEffect(() => {
    const fabric = window.fabric;
    if (!fabric || !canvasRef.current) return;

    const parent = canvasRef.current.parentElement;
    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: "#0c0f18",
      width: parent.clientWidth,
      height: parent.clientHeight,
    });

    canvas.freeDrawingBrush.color = color;
    canvas.freeDrawingBrush.width = brushSize;
    fabricRef.current = canvas;

    canvas.on("path:created", ({ path }) => {
      if (isRemote.current) return;
      setObjectCount(canvas.getObjects().length);
      socket.current?.emit("whiteboard-event", {
        roomId,
        event: { type: "path:created", data: path.toJSON() },
      });
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
    };
  }, []);

  // Remote events
  useEffect(() => {
    if (!socket.current) return;
    const sock = socket.current;

    const handle = ({ event }) => {
      const canvas = fabricRef.current;
      const fabric = window.fabric;
      if (!canvas) return;
      isRemote.current = true;

      if (event.type === "path:created") {
        fabric.Path.fromObject(event.data, (path) => {
          canvas.add(path);
          canvas.renderAll();
          setObjectCount(canvas.getObjects().length);
          isRemote.current = false;
        });
      } else if (event.type === "clear") {
        canvas.clear();
        canvas.backgroundColor = "#0c0f18";
        canvas.renderAll();
        setObjectCount(0);
        isRemote.current = false;
      } else {
        isRemote.current = false;
      }
    };

    sock.on("whiteboard-event", handle);
    return () => sock.off("whiteboard-event", handle);
  }, [socket]);

  // Tool changes
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
      setObjectCount(canvas.getObjects().length);
    }
  }, []);

  return (
    <div style={s.container}>
      {/* Toolbar */}
      <div style={s.toolbar}>
        {/* Tools */}
        <div style={s.toolGroup}>
          {[
            { id: "pen",    icon: "✏️", label: "Draw" },
            { id: "eraser", icon: "◻",  label: "Erase" },
            { id: "select", icon: "↖",  label: "Select" },
          ].map(t => (
            <ToolBtn key={t.id} icon={t.icon} label={t.label}
              active={tool === t.id} onClick={() => setTool(t.id)} />
          ))}
        </div>

        <div style={s.sep} />

        {/* Colors */}
        <div style={s.colorRow}>
          {COLORS.map(c => (
            <button key={c.hex} title={c.label}
              style={{
                ...s.colorBtn,
                background: c.hex,
                transform: color === c.hex && tool === "pen" ? "scale(1.25)" : "scale(1)",
                boxShadow: color === c.hex && tool === "pen" ? `0 0 0 2px rgba(255,255,255,0.2), 0 0 8px ${c.hex}66` : "none",
              }}
              onClick={() => { setColor(c.hex); setTool("pen"); }}
            />
          ))}
        </div>

        <div style={s.sep} />

        {/* Brush sizes */}
        <div style={s.toolGroup}>
          {BRUSHES.map(b => (
            <button key={b.size}
              style={{ ...s.sizeBtn, ...(brushSize === b.size ? s.sizeBtnActive : {}) }}
              onClick={() => setBrushSize(b.size)}
              title={b.label}
            >
              <div style={{ width: Math.min(b.size + 2, 16), height: Math.min(b.size + 2, 16), borderRadius: "50%", background: tool === "pen" ? color : "rgba(255,255,255,0.3)" }} />
            </button>
          ))}
        </div>

        <div style={s.sep} />

        {/* Actions */}
        <div style={s.toolGroup}>
          <ToolBtn icon="↩" label="Undo" onClick={undo} disabled={objectCount === 0} />
          <ToolBtn icon="🗑" label="Clear" onClick={clear} disabled={objectCount === 0} />
        </div>

        <div style={{ flex: 1 }} />

        {/* Object count */}
        {objectCount > 0 && (
          <div style={s.countChip}>{objectCount} stroke{objectCount !== 1 ? "s" : ""}</div>
        )}

        {/* Close */}
        <button style={s.closeBtn} onClick={onClose}>
          <span>✕</span>
          <span>Close board</span>
        </button>
      </div>

      {/* Canvas */}
      <div style={s.canvasWrap}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function ToolBtn({ icon, label, active, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{ ...s.toolBtn, ...(active ? s.toolBtnActive : {}), ...(hov && !disabled ? s.toolBtnHov : {}), ...(disabled ? s.toolBtnDisabled : {}) }}
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={label}
    >
      {icon}
    </button>
  );
}

const s = {
  container: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#0c0f18", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" },
  toolbar: { display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", background: "rgba(6,8,16,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, flexWrap: "wrap", minHeight: 52 },
  toolGroup: { display: "flex", alignItems: "center", gap: 2 },
  sep: { width: 1, height: 24, background: "rgba(255,255,255,0.06)", margin: "0 4px" },
  toolBtn: { width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: "#626880", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", fontFamily: "inherit" },
  toolBtnHov: { background: "rgba(255,255,255,0.06)", color: "#a0a6b8" },
  toolBtnActive: { background: "rgba(108,99,255,0.2)", borderColor: "rgba(108,99,255,0.4)", color: "#a78bfa" },
  toolBtnDisabled: { opacity: 0.3, cursor: "not-allowed" },
  colorRow: { display: "flex", alignItems: "center", gap: 5 },
  colorBtn: { width: 18, height: 18, borderRadius: "50%", border: "none", cursor: "pointer", transition: "all 0.15s", flexShrink: 0 },
  sizeBtn: { width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" },
  sizeBtnActive: { background: "rgba(108,99,255,0.15)", borderColor: "rgba(108,99,255,0.35)" },
  countChip: { fontSize: 11, color: "#3d4258", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, padding: "3px 9px", fontFamily: "'DM Mono', monospace" },
  closeBtn: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.2)", borderRadius: 8, color: "#ff6b8a", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" },
  canvasWrap: { flex: 1, overflow: "hidden" },
};
