import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("formify_token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("formify_user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem("formify_token", token);
    else localStorage.removeItem("formify_token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("formify_user", JSON.stringify(user));
    else localStorage.removeItem("formify_user");
  }, [user]);

  const value = useMemo(() => {
    async function login({ rollNumber, password }) {
      const { data } = await api.post("/api/auth/login", { rollNumber, password });
      setToken(data.token);
      setUser(data.user);
      return data;
    }

    function logout() {
      setToken(null);
      setUser(null);
    }

    return {
      token,
      user,
      isAuthed: Boolean(token && user),
      login,
      logout
    };
  }, [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

