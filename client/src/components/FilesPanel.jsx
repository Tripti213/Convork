import { useState, useEffect, useRef } from "react";

const FILE_TYPES = {
  "application/pdf":  { icon: "📄", color: "#ff4d6d", bg: "rgba(255,77,109,0.1)" },
  "image/":           { icon: "🖼",  color: "#10d9a0", bg: "rgba(16,217,160,0.1)" },
  "video/":           { icon: "🎬",  color: "#6c63ff", bg: "rgba(108,99,255,0.1)" },
  "audio/":           { icon: "🎵",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "application/zip":  { icon: "🗜",  color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  "text/":            { icon: "📝",  color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  default:            { icon: "📎",  color: "#626880", bg: "rgba(255,255,255,0.06)" },
};

function getType(mime = "") {
  for (const [key, val] of Object.entries(FILE_TYPES)) {
    if (mime.startsWith(key)) return val;
  }
  return FILE_TYPES.default;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function FilesPanel({ socket, roomId, token }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch(`/api/files/room/${roomId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setFiles(data))
      .catch(() => {});
  }, [roomId, token]);

  useEffect(() => {
    if (!socket.current) return;
    const sock = socket.current;
    const handle = (fileData) => setFiles(prev => [fileData, ...prev]);
    sock.on("file-uploaded", handle);
    return () => sock.off("file-uploaded", handle);
  }, [socket]);

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return setError("File too large. Max 50MB.");
    setError(""); setUploading(true); setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/files/upload/${roomId}`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100));
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setFiles(prev => [data, ...prev]);
          socket.current?.emit("file-uploaded", { roomId, file: data });
          resolve();
        } else reject(new Error("Upload failed"));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    }).catch(err => setError(err.message));

    setUploading(false); setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={s.panel}>
      {/* Drop zone */}
      <div
        style={{ ...s.dropZone, ...(dragOver ? s.dropZoneDrag : {}), ...(uploading ? s.dropZoneUploading : {}) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files[0]); }}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={e => upload(e.target.files[0])} />

        {uploading ? (
          <div style={s.uploadingState}>
            <div style={s.progressRing}>
              <svg viewBox="0 0 36 36" style={{ width: 48, height: 48 }}>
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#6c63ff" strokeWidth="2"
                  strokeDasharray={`${progress * 0.942} 94.2`}
                  strokeLinecap="round"
                  style={{ transformOrigin: "50% 50%", transform: "rotate(-90deg)", transition: "stroke-dasharray 0.3s" }}
                />
              </svg>
              <span style={s.progressPct}>{progress}%</span>
            </div>
            <span style={s.uploadingText}>Uploading…</span>
          </div>
        ) : (
          <>
            <div style={{ ...s.dropIcon, ...(dragOver ? s.dropIconDrag : {}) }}>
              {dragOver ? "📂" : "↑"}
            </div>
            <span style={s.dropTitle}>{dragOver ? "Drop to upload" : "Upload file"}</span>
            <span style={s.dropSub}>Drag & drop or click · Max 50MB</span>
          </>
        )}
      </div>

      {error && (
        <div style={s.error}>⚠ {error}</div>
      )}

      {/* File list */}
      <div style={s.fileList}>
        {files.length === 0 && !uploading && (
          <div style={s.empty}>
            <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>📁</div>
            <div style={s.emptyText}>No files shared yet</div>
          </div>
        )}

        {files.map((file, i) => {
          const type = getType(file.mimeType);
          return (
            <div key={file.id} style={{ ...s.fileItem, animationDelay: `${i * 0.04}s` }}>
              <div style={{ ...s.fileIconWrap, background: type.bg }}>
                <span style={s.fileIcon}>{type.icon}</span>
              </div>
              <div style={s.fileMeta}>
                <div style={s.fileName} title={file.name}>{file.name}</div>
                <div style={s.fileInfo}>
                  <span style={{ color: type.color }}>{formatSize(file.size)}</span>
                  <span style={s.dot}>·</span>
                  <span>{file.uploadedBy}</span>
                  <span style={s.dot}>·</span>
                  <span>{timeAgo(file.uploadedAt)}</span>
                </div>
              </div>
              <a href={file.downloadUrl} download={file.name} style={s.dlBtn} onClick={e => e.stopPropagation()} title="Download">
                <span>↓</span>
              </a>
            </div>
          );
        })}
      </div>

      {/* Encryption note */}
      <div style={s.footer}>
        <span style={s.lockIcon}>🔒</span>
        <span>Files encrypted at rest (AES-256)</span>
      </div>
    </div>
  );
}

const s = {
  panel: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },
  dropZone: { margin: "12px", border: "1.5px dashed rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", transition: "all 0.2s", background: "rgba(255,255,255,0.01)", flexShrink: 0 },
  dropZoneDrag: { borderColor: "rgba(108,99,255,0.5)", background: "rgba(108,99,255,0.06)", transform: "scale(0.99)" },
  dropZoneUploading: { cursor: "default", borderColor: "rgba(108,99,255,0.3)", background: "rgba(108,99,255,0.04)" },
  dropIcon: { width: 36, height: 36, borderRadius: 10, background: "rgba(108,99,255,0.12)", border: "1px solid rgba(108,99,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#6c63ff", fontWeight: 700, marginBottom: 4, transition: "all 0.2s" },
  dropIconDrag: { transform: "scale(1.1)", background: "rgba(108,99,255,0.2)" },
  dropTitle: { fontSize: 13, fontWeight: 600, color: "#a0a6b8" },
  dropSub: { fontSize: 11, color: "#3d4258" },
  uploadingState: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  progressRing: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center" },
  progressPct: { position: "absolute", fontSize: 11, fontWeight: 700, color: "#a78bfa", fontFamily: "'DM Mono', monospace" },
  uploadingText: { fontSize: 12, color: "#626880" },
  error: { margin: "0 12px 8px", padding: "8px 12px", background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", borderRadius: 9, color: "#ff8fa3", fontSize: 12 },
  fileList: { flex: 1, overflowY: "auto", padding: "4px 8px" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0" },
  emptyText: { fontSize: 13, color: "#2a2f42" },
  fileItem: { display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", borderRadius: 10, transition: "background 0.15s", cursor: "default", animation: "slide-in-up 0.25s both" },
  fileIconWrap: { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fileIcon: { fontSize: 17 },
  fileMeta: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 13, fontWeight: 600, color: "#c8ccd8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 },
  fileInfo: { display: "flex", gap: 4, fontSize: 11, color: "#3d4258" },
  dot: { color: "#2a2f42" },
  dlBtn: { width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#626880", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 14, flexShrink: 0, transition: "all 0.15s" },
  footer: { display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 12px 12px", fontSize: 10, color: "#2a2f42", letterSpacing: "0.04em" },
  lockIcon: { fontSize: 11 },
};
