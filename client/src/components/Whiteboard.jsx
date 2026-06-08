import { useEffect, useRef, useState, useCallback } from "react";

// Fabric.js is loaded via CDN script tag in index.html:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>

const COLORS = ["#ffffff", "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#a855f7", "#ec4899", "#000000"];
const BRUSH_SIZES = [2, 4, 8, 14];

export default function Whiteboard({ socket, roomId, onClose }) {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const isRemoteEvent = useRef(false);

  const [tool, setTool] = useState("pen"); // pen | eraser | select
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(4);

  // ─── Init Fabric canvas ────────────────────────────────────────────────────
  useEffect(() => {
    const fabric = window.fabric;
    if (!fabric || !canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: "#1e2329",
      width: canvasRef.current.parentElement.clientWidth,
      height: canvasRef.current.parentElement.clientHeight - 52, // subtract toolbar
    });

    canvas.freeDrawingBrush.color = color;
    canvas.freeDrawingBrush.width = brushSize;
    fabricRef.current = canvas;

    // Broadcast path:created to peers
    canvas.on("path:created", ({ path }) => {
      if (isRemoteEvent.current) return;
      const pathData = path.toJSON();
      socket.current?.emit("whiteboard-event", {
        roomId,
        event: { type: "path:created", data: pathData },
      });
    });

    canvas.on("object:modified", ({ target }) => {
      if (isRemoteEvent.current) return;
      socket.current?.emit("whiteboard-event", {
        roomId,
        event: { type: "object:modified", data: target.toJSON(["id"]) },
      });
    });

    // Handle resize
    const onResize = () => {
      canvas.setWidth(canvasRef.current?.parentElement?.clientWidth || 800);
      canvas.setHeight((canvasRef.current?.parentElement?.clientHeight || 600) - 52);
      canvas.renderAll();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      canvas.dispose();
    };
  }, []);

  // ─── Receive remote whiteboard events ─────────────────────────────────────
  useEffect(() => {
    if (!socket.current) return;
    const sock = socket.current;

    const handleRemoteEvent = ({ event }) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const fabric = window.fabric;

      isRemoteEvent.current = true;

      if (event.type === "path:created") {
        fabric.Path.fromObject(event.data, (path) => {
          canvas.add(path);
          canvas.renderAll();
          isRemoteEvent.current = false;
        });
      } else if (event.type === "clear") {
        canvas.clear();
        canvas.backgroundColor = "#1e2329";
        canvas.renderAll();
        isRemoteEvent.current = false;
      } else {
        isRemoteEvent.current = false;
      }
    };

    sock.on("whiteboard-event", handleRemoteEvent);
    return () => sock.off("whiteboard-event", handleRemoteEvent);
  }, [socket]);

  // ─── Tool changes ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (tool === "select") {
      canvas.isDrawingMode = false;
    } else if (tool === "eraser") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = "#1e2329";
      canvas.freeDrawingBrush.width = brushSize * 3;
    } else {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushSize;
    }
  }, [tool, color, brushSize]);

  const clearCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#1e2329";
    canvas.renderAll();
    socket.current?.emit("whiteboard-event", {
      roomId,
      event: { type: "clear" },
    });
  }, [socket, roomId]);

  const undoLast = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length > 0) canvas.remove(objects[objects.length - 1]);
  }, []);

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        {/* Tools */}
        <div style={styles.toolGroup}>
          {[
            { id: "pen", icon: "✏️", label: "Draw" },
            { id: "eraser", icon: "◻", label: "Erase" },
            { id: "select", icon: "↖", label: "Select" },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              style={{ ...styles.toolBtn, ...(tool === id ? styles.toolActive : {}) }}
              onClick={() => setTool(id)}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>

        <div style={styles.separator} />

        {/* Colors */}
        <div style={styles.toolGroup}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              style={{
                ...styles.colorBtn,
                background: c,
                boxShadow: color === c && tool === "pen" ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : "none",
              }}
              title={c}
            />
          ))}
        </div>

        <div style={styles.separator} />

        {/* Brush sizes */}
        <div style={styles.toolGroup}>
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              style={{ ...styles.sizeBtn, ...(brushSize === size ? styles.toolActive : {}) }}
              title={`${size}px`}
            >
              <div style={{ width: size + 4, height: size + 4, borderRadius: "50%", background: color, maxWidth: 18, maxHeight: 18 }} />
            </button>
          ))}
        </div>

        <div style={styles.separator} />

        {/* Actions */}
        <div style={styles.toolGroup}>
          <button style={styles.toolBtn} onClick={undoLast} title="Undo last stroke">↩</button>
          <button style={styles.toolBtn} onClick={clearCanvas} title="Clear board">🗑</button>
        </div>

        <div style={{ flex: 1 }} />

        <button style={styles.closeBtn} onClick={onClose}>✕ Close</button>
      </div>

      {/* Canvas */}
      <div style={styles.canvasWrap}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "absolute",
    inset: 0,
    background: "#1e2329",
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 12px",
    background: "#161a1e",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    flexWrap: "wrap",
    height: 52,
    flexShrink: 0,
  },
  toolGroup: { display: "flex", alignItems: "center", gap: 3 },
  separator: { width: 1, height: 24, background: "rgba(255,255,255,0.07)", margin: "0 4px" },
  toolBtn: {
    width: 30, height: 30,
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 6,
    background: "transparent",
    color: "#a0a6b0",
    cursor: "pointer",
    fontSize: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  toolActive: {
    background: "rgba(59,130,246,0.2)",
    borderColor: "rgba(59,130,246,0.5)",
    color: "#3b82f6",
  },
  colorBtn: {
    width: 20, height: 20,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    transition: "box-shadow 0.15s",
  },
  sizeBtn: {
    width: 30, height: 30,
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 6,
    background: "transparent",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  closeBtn: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#ef4444",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  canvasWrap: { flex: 1, overflow: "hidden" },
};
