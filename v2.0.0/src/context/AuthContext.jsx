import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const API_BASE = "/api";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(false);
      }
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.data?.token) {
      localStorage.setItem("token", res.data.token);
    }
    const loggedUser = res.data?.user;
    if (loggedUser) {
      setUser(loggedUser);
      return loggedUser;
    }
    throw new Error("Giriş yapılamadı");
  };

  const register = async (name, email, password, phone, consents) => {
    const res = await api.post("/auth/register", {
      name,
      email,
      password,
      phone: phone || "",
      kvkk_consent: consents?.kvkk || false,
      marketing_consent: consents?.marketing || false,
    });
    if (res.data?.token) {
      localStorage.setItem("token", res.data.token);
    }
    const registeredUser = res.data?.user;
    if (registeredUser) {
      setUser(registeredUser);
      return registeredUser;
    }
    throw new Error("Kayıt oluşturulamadı");
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem("token");
    setUser(false);
  };

  const updateUser = (u) => setUser(u);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
