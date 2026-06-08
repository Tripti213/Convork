import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.dot} />
          Convork
        </div>
        <h1 style={styles.title}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p style={styles.sub}>
          {mode === "login"
            ? "Sign in to join or start a meeting"
            : "Get started for free — no credit card needed"}
        </p>

        <form onSubmit={submit} style={styles.form}>
          {mode === "register" && (
            <div style={styles.field}>
              <label style={styles.label}>Full name</label>
              <input
                style={styles.input}
                type="text"
                placeholder="Jason Doe"
                value={form.name}
                onChange={update("name")}
                required
              />
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update("email")}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder={mode === "register" ? "At least 6 characters" : "••••••••"}
              value={form.password}
              onChange={update("password")}
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p style={styles.toggle}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span
            style={styles.link}
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0d0f11",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    padding: "20px",
  },
  card: {
    background: "#161a1e",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 400,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    fontSize: 16,
    color: "#e8eaed",
    marginBottom: 28,
  },
  dot: {
    width: 8, height: 8,
    borderRadius: "50%",
    background: "#3b82f6",
    boxShadow: "0 0 8px rgba(59,130,246,0.6)",
  },
  title: { color: "#e8eaed", fontSize: 22, fontWeight: 600, marginBottom: 6 },
  sub: { color: "#7c8490", fontSize: 14, marginBottom: 28 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "#a0a6b0" },
  input: {
    background: "#1e2329",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#e8eaed",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  },
  btn: {
    background: "#3b82f6",
    border: "none",
    borderRadius: 8,
    padding: "11px",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  },
  error: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#f87171",
    fontSize: 13,
  },
  toggle: { color: "#7c8490", fontSize: 13, textAlign: "center", marginTop: 20 },
  link: { color: "#3b82f6", cursor: "pointer", fontWeight: 500 },
};
