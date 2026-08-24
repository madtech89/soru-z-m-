import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    if (error) return null;
    return data;
  }, []);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setUser(false);
      setLoading(false);
      return;
    }
    const profile = await loadProfile(session.user.id);
    if (profile) {
      setUser({ ...profile, email: session.user.email });
    } else {
      setUser(false);
    }
    setLoading(false);
  }, [loadProfile]);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === "SIGNED_OUT" || !session) {
          setUser(false);
          setLoading(false);
          return;
        }
        const profile = await loadProfile(session.user.id);
        if (profile) {
          setUser({ ...profile, email: session.user.email });
        } else {
          setUser(false);
        }
        setLoading(false);
      })();
    });
    return () => subscription.unsubscribe();
  }, [refresh, loadProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await loadProfile(data.user.id);
    if (profile) {
      setUser({ ...profile, email: data.user.email });
      return { ...profile, email: data.user.email };
    }
    throw new Error("Profil bulunamadı");
  };

  const register = async (name, email, password, phone, consents) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    });
    if (error) throw error;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      name,
      email,
      username: "",
      role: "user",
      avatar: "",
      phone: phone || "",
      kvkk_consent: consents?.kvkk || false,
      marketing_consent: consents?.marketing || false,
      consent_date: consents?.kvkk ? new Date().toISOString() : null,
      target_exams: [],
      target_score: null,
      daily_goal: 20,
      xp: 0,
      streak: 0,
    });
    if (profileError) throw profileError;

    const profile = await loadProfile(data.user.id);
    if (profile) {
      setUser({ ...profile, email: data.user.email });
      return { ...profile, email: data.user.email };
    }
    throw new Error("Profil oluşturulamadı");
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
