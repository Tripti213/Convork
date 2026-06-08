import { useState, useEffect, useRef } from "react";

const FILE_ICONS = {
  "application/pdf": "📄",
  "image/": "🖼",
  "video/": "🎬",
  "audio/": "🎵",
  "application/zip": "🗜",
  "application/vnd.openxmlformats": "📊",
  "text/": "📝",
  default: "📎",
};

const getIcon = (mimeType = "") => {
  for (const [key, icon] of Object.entries(FILE_ICONS)) {
    if (mimeType.startsWith(key)) return icon;
  }
  return FILE_ICONS.default;
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export default function FilesPanel({ socket, roomId, token }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Load existing files on mount
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const res = await fetch(`/api/files/room/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setFiles(data);
        }
      } catch {}
    };
    loadFiles();
  }, [roomId, token]);

  // Listen for new file uploads from other users
  useEffect(() => {
    if (!socket.current) return;
    const sock = socket.current;

    const handleNewFile = (fileData) => {
      setFiles((prev) => [fileData, ...prev]);
    };

    sock.on("file-uploaded", handleNewFile);
    return () => sock.off("file-uploaded", handleNewFile);
  }, [socket]);

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      return setError("File too large. Max 50MB.");
    }
    setError("");
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Use XMLHttpRequest for progress tracking
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/files/upload/${roomId}`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            setFiles((prev) => [data, ...prev]);
            // Broadcast to room
            socket.current?.emit("file-uploaded", { roomId, file: data });
            resolve(data);
          } else {
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  return (
    <div style={styles.panel}>
      {/* Drop zone */}
      <div
        style={{ ...styles.dropZone, ...(uploading ? styles.dropZoneUploading : {}) }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => upload(e.target.files[0])}
        />
        {uploading ? (
          <div style={styles.progressWrap}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${uploadProgress}%` }} />
            </div>
            <span style={styles.progressText}>Uploading… {uploadProgress}%</span>
          </div>
        ) : (
          <>
            <span style={{ fontSize: 20 }}>↑</span>
            <span style={styles.dropText}>Click or drag file to upload</span>
            <span style={styles.dropSub}>Max 50MB per file</span>
          </>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* File list */}
      <div style={styles.list}>
        {files.length === 0 && (
          <div style={styles.empty}>No files shared yet</div>
        )}
        {files.map((file) => (
          <div key={file.id} style={styles.fileItem}>
            <div style={styles.fileIcon}>{getIcon(file.mimeType)}</div>
            <div style={styles.fileMeta}>
              <div style={styles.fileName} title={file.name}>{file.name}</div>
              <div style={styles.fileInfo}>
                {formatSize(file.size)} · {file.uploadedBy} · {formatDate(file.uploadedAt)}
              </div>
            </div>
            <a
              href={file.downloadUrl}
              download={file.name}
              style={styles.dlBtn}
              title="Download"
              onClick={(e) => e.stopPropagation()}
            >
              ↓
            </a>
          </div>
        ))}
      </div>

      <div style={styles.footer}>🔒 Files are encrypted at rest (AES-256)</div>
    </div>
  );
}

const styles = {
  panel: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", padding: "12px" },
  dropZone: { border: "1.5px dashed rgba(255,255,255,0.15)", borderRadius: 10, padding: "16px 12px", textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all 0.15s", background: "transparent", marginBottom: 12 },
  dropZoneUploading: { borderColor: "rgba(59,130,246,0.5)", background: "rgba(59,130,246,0.05)", cursor: "default" },
  dropText: { fontSize: 13, color: "#a0a6b0", fontWeight: 500 },
  dropSub: { fontSize: 11, color: "#5a6270" },
  progressWrap: { width: "100%", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" },
  progressBar: { width: "100%", height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", background: "#3b82f6", borderRadius: 4, transition: "width 0.2s" },
  progressText: { fontSize: 12, color: "#7c8490" },
  error: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "8px 12px", color: "#f87171", fontSize: 12, marginBottom: 8 },
  list: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 },
  empty: { padding: "24px 0", textAlign: "center", color: "#5a6270", fontSize: 13 },
  fileItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 8, transition: "background 0.1s", cursor: "default" },
  fileIcon: { width: 36, height: 36, borderRadius: 8, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 },
  fileMeta: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 13, fontWeight: 500, color: "#e8eaed", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileInfo: { fontSize: 11, color: "#5a6270", marginTop: 1 },
  dlBtn: { width: 28, height: 28, borderRadius: 6, background: "#1e2329", border: "1px solid rgba(255,255,255,0.08)", color: "#7c8490", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 14, flexShrink: 0, transition: "all 0.15s" },
  footer: { padding: "10px 0 2px", fontSize: 11, color: "#3a4250", textAlign: "center" },
};
