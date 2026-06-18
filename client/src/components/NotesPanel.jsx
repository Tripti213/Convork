import { useState, useEffect, useRef, useCallback } from "react";

export default function NotesPanel({ roomId, token }) {
  const [content, setContent]   = useState("");
  const [loading, setLoading]   = useState(true);
  const [saveState, setSaveState] = useState("idle");
  const saveTimerRef  = useRef(null);
  const lastSavedRef  = useRef("");
  // Bug Fix: keep a ref mirroring the latest content. The unmount-cleanup
  // effect's closure was capturing `content` from MOUNT TIME (empty
  // string), since that effect's dependency array is [roomId, token]
  // which never changes — so its cleanup function was created ONCE and
  // never updated, even though the user kept typing. Reading from a ref
  // instead always gets the truly current value, since refs are mutated
  // directly (not through React's render/closure cycle).
  const contentRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/notes/room/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setContent(data.content || "");
        contentRef.current = data.content || "";
        lastSavedRef.current = data.content || "";
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [roomId, token]);

  const saveNotes = useCallback(async (text) => {
    if (text === lastSavedRef.current) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/notes/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        lastSavedRef.current = text;
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } else {
        setSaveState("idle");
      }
    } catch {
      setSaveState("idle");
    }
  }, [roomId, token]);

  const handleChange = (e) => {
    const text = e.target.value;
    setContent(text);
    contentRef.current = text; // keep ref in sync on every keystroke

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNotes(text), 1200);
  };

  // Save on unmount/tab-switch — now reads from contentRef (always live)
  // instead of `content` (stale closure from when this effect was created)
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const liveContent = contentRef.current;
      if (liveContent !== lastSavedRef.current) {
        fetch(`/api/notes/room/${roomId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ content: liveContent }),
        }).catch(() => {});
      }
    };
  }, [roomId, token]);

  if (loading) {
    return (
      <div style={s.panel}>
        <div style={s.loadingState}><div style={s.spinner} /></div>
      </div>
    );
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.headerTitle}>My notes</span>
        <SaveIndicator state={saveState} />
      </div>

      <textarea
        style={s.textarea}
        value={content}
        onChange={handleChange}
        placeholder="Jot down notes, action items, or anything you want to remember from this meeting…"
        spellCheck
      />

      <div style={s.footer}>
        <span>🔒</span>
        <span>Only visible to you · Saved automatically</span>
      </div>
    </div>
  );
}

function SaveIndicator({ state }) {
  if (state === "saving") return <span style={s.saveTag}>Saving…</span>;
  if (state === "saved") return <span style={{ ...s.saveTag, color: "#10d9a0" }}>✓ Saved</span>;
  return null;
}

const s = {
  panel:       { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },
  header:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  headerTitle: { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3d4258" },
  saveTag:     { fontSize: 11, color: "#626880", fontWeight: 600, transition: "color 0.2s" },
  textarea:    { flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", color: "#c8ccd8", fontSize: 13.5, lineHeight: 1.7, padding: "14px 16px", fontFamily: "inherit" },
  footer:      { display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 12px 12px", fontSize: 10, color: "#2a2f42", borderTop: "1px solid rgba(255,255,255,0.04)" },
  loadingState:{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  spinner:     { width: 22, height: 22, borderRadius: "50%", borderWidth: "2px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#6c63ff", animation: "spin 0.7s linear infinite" },
};