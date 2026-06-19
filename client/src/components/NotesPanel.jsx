import { useState, useEffect, useRef, useCallback } from "react";
import useScreenshotCapture from "../hooks/useScreenshotCapture";
import AreaSelectOverlay from "./AreaSelectOverlay";
import { apiUrl } from "../config/api";

export default function NotesPanel({ roomId, token }) {
  const editorRef = useRef(null);
  const [loading, setLoading]   = useState(true);
  const [saveState, setSaveState] = useState("idle");
  const saveTimerRef = useRef(null);
  const lastSavedRef = useRef("");
  const liveContentRef = useRef("");

  const {
    capturing, pendingFrame, captureFullScreen,
    captureForAreaSelect, cropPendingFrame, cancelAreaSelect,
  } = useScreenshotCapture();

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiUrl}/notes/room/${roomId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const html = data.content || "";
        if (editorRef.current) editorRef.current.innerHTML = html;
        liveContentRef.current = html;
        lastSavedRef.current = html;
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [roomId, token]);

  const getCurrentHtml = () => editorRef.current?.innerHTML ?? liveContentRef.current;

  const saveNotes = useCallback(async (htmlOverride) => {
    const html = htmlOverride !== undefined ? htmlOverride : getCurrentHtml();
    if (html === lastSavedRef.current) return;
    setSaveState("saving");
    try {
      const res = await fetch(`${apiUrl}/notes/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: html }),
      });
      if (res.ok) {
        lastSavedRef.current = html;
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } else {
        setSaveState("idle");
      }
    } catch {
      setSaveState("idle");
    }
  }, [roomId, token]);

  const handleInput = () => {
    liveContentRef.current = editorRef.current?.innerHTML || "";
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNotes(), 1200);
  };

  const syncLiveContent = () => {
    liveContentRef.current = editorRef.current?.innerHTML || "";
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const html = liveContentRef.current;
      if (html !== lastSavedRef.current) {
        fetch(`${apiUrl}/notes/room/${roomId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ content: html }),
        }).catch(() => {});
      }
    };
  }, [roomId, token]);

  const insertImageAtCursor = (dataUrl) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const wrapper = document.createElement("span");
    wrapper.contentEditable = "false";
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    wrapper.className = "note-screenshot-wrapper";

    const img = document.createElement("img");
    img.src = dataUrl;
    img.style.maxWidth = "100%";
    img.style.borderRadius = "8px";
    img.style.display = "block";
    img.style.margin = "8px 0";
    img.className = "note-screenshot";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✕";
    deleteBtn.title = "Remove screenshot";
    deleteBtn.style.cssText = `
      position: absolute; top: 4px; right: 4px;
      width: 22px; height: 22px; border-radius: 6px;
      background: rgba(0,0,0,0.6); color: #fff; border: none;
      cursor: pointer; font-size: 11px; display: flex;
      align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.15s;
    `;
    deleteBtn.onmouseenter = () => { deleteBtn.style.opacity = "1"; };
    wrapper.onmouseenter = () => { deleteBtn.style.opacity = "1"; };
    wrapper.onmouseleave = () => { deleteBtn.style.opacity = "0"; };
    deleteBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      wrapper.remove();
      syncLiveContent();
      saveNotes();
    };

    wrapper.appendChild(img);
    wrapper.appendChild(deleteBtn);

    const selection = window.getSelection();
    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(wrapper);
      range.setStartAfter(wrapper);
      range.setEndAfter(wrapper);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editor.appendChild(wrapper);
    }

    const br = document.createElement("br");
    wrapper.after(br);

    syncLiveContent();
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNotes(), 1200);
  };

  const handleFullScreenshot = async () => {
    const dataUrl = await captureFullScreen();
    if (dataUrl) insertImageAtCursor(dataUrl);
  };
  const handleAreaScreenshot = async () => { await captureForAreaSelect(); };
  const handleAreaConfirm = (rectPercent) => {
    const dataUrl = cropPendingFrame(rectPercent);
    if (dataUrl) insertImageAtCursor(dataUrl);
  };

  const handleBlur = () => {
    syncLiveContent();
    saveNotes();
  };

  if (loading) {
    return <div style={s.panel}><div style={s.loadingState}><div style={s.spinner} /></div></div>;
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.headerTitle}>My notes</span>
        <SaveIndicator state={saveState} />
      </div>

      <div style={s.toolbar}>
        <button style={s.toolBtn} onClick={handleFullScreenshot} disabled={capturing}>
          <span>🖥</span> Screenshot
        </button>
        <button style={s.toolBtn} onClick={handleAreaScreenshot} disabled={capturing}>
          <span>✂️</span> Select area
        </button>
        {capturing && <span style={s.capturingTag}>Choose a screen…</span>}
      </div>

      <div
        ref={editorRef}
        style={s.editor}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        data-placeholder="Type notes, or click Screenshot to capture something from your screen…"
      />

      <div style={s.footer}>
        <span>🔒</span>
        <span>Only visible to you · Saved automatically</span>
      </div>

      {pendingFrame && (
        <AreaSelectOverlay canvas={pendingFrame} onConfirm={handleAreaConfirm} onCancel={cancelAreaSelect} />
      )}
    </div>
  );
}

function SaveIndicator({ state }) {
  if (state === "saving") return <span style={s.saveTag}>Saving…</span>;
  if (state === "saved") return <span style={{ ...s.saveTag, color: "#10d9a0" }}>✓ Saved</span>;
  return null;
}

const s = {
  panel:        { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },
  header:       { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  headerTitle:  { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3d4258" },
  saveTag:      { fontSize: 11, color: "#626880", fontWeight: 600 },
  toolbar:      { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  toolBtn:      { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.04)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.07)", borderRadius: 8, color: "#a0a6b8", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" },
  capturingTag: { fontSize: 11, color: "#a78bfa", fontStyle: "italic" },
  editor:       { flex: 1, overflowY: "auto", color: "#c8ccd8", fontSize: 13.5, lineHeight: 1.7, padding: "14px 16px", outline: "none", whiteSpace: "pre-wrap", wordBreak: "break-word" },
  footer:       { display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 12px 12px", fontSize: 10, color: "#2a2f42", borderTop: "1px solid rgba(255,255,255,0.04)" },
  loadingState: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  spinner:      { width: 22, height: 22, borderRadius: "50%", borderWidth: "2px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#6c63ff", animation: "spin 0.7s linear infinite" },
};