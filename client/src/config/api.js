export const API_BASE = import.meta.env.VITE_SERVER_URL || "";
 
export function apiUrl(path) {
  // path should start with "/", e.g. "/api/auth/login"
  return `${API_BASE}${path}`;
}