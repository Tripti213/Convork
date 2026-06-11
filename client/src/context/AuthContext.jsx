import { createContext, useContext, useState, useEffect, useRef } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const verifiedRef = useRef(false); // prevent double-run in StrictMode

  useEffect(() => {
    if (verifiedRef.current) return; // guard against StrictMode double effect
    verifiedRef.current = true;

    const verify = async () => {
      const stored = localStorage.getItem("token");
      if (!stored) {
        setLoading(false);
        return;
      }

      // Always set token + decode user immediately so UI doesn't flash logged-out
      try {
        const payload = JSON.parse(atob(stored.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          setToken(stored);
          setUser({ id: payload.id, name: payload.name, email: payload.email });
        } else {
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
          setLoading(false);
          return;
        }
      } catch {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Then verify with server in background to get fresh user data (avatarColor etc)
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${stored}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else if (res.status === 401 || res.status === 403) {
          // Only log out on explicit auth rejection
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
        // Other errors (500, etc) — keep existing session from JWT decode
      } catch {
        // Network error — keep existing session from JWT decode
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, []);

  const login = async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");

    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);