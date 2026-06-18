import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Room from "./pages/Room";
import MyNotes from "./pages/MyNotes";

// Protected route — redirect to login if not authenticated
const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={loadingStyle}>
      <div style={spinnerStyle} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/room/:roomId" element={<Protected><Room /></Protected>} />
          <Route path="*"          element={<Navigate to="/" replace />} />
          <Route path="/notes" element={<Protected><MyNotes /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const loadingStyle = {
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#060810",
};

const spinnerStyle = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "2px solid rgba(108,99,255,0.2)",
  borderTopColor: "#6c63ff",
  animation: "spin 0.7s linear infinite",
};
