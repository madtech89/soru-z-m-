import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const SIDE_IMG = "https://images.unsplash.com/photo-1728455635901-bb16530faf40?crop=entropy&cs=srgb&fm=jpg&q=85";

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-paper grid lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 sm:px-14 py-10">
        <Link to="/" className="flex items-center gap-2 mb-12" data-testid="auth-logo">
          <span className="h-8 w-8 rounded-lg bg-subject-matematik grid place-items-center"><Sparkles size={16} className="text-white" /></span>
          <span className="font-heading font-extrabold text-xl tracking-tight">Netor</span>
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-sm">
          <h1 className="font-heading font-extrabold tracking-tighter text-4xl mb-2">{title}</h1>
          <p className="text-zinc-500 mb-8">{subtitle}</p>
          {children}
        </motion.div>
      </div>
      <div className="hidden lg:block relative m-3 rounded-3xl overflow-hidden">
        <img src={SIDE_IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="font-editorial italic text-2xl leading-snug">"Zayıf konunu bul, doğru soruyu çöz, sınavı kazan."</p>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-subject-matematik focus:ring-2 focus:ring-subject-matematik/20 transition";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Hoş geldin!");
      nav("/app");
    } catch (err) {
      toast.error(err.message || "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Tekrar hoş geldin" subtitle="Hesabına giriş yap ve kaldığın yerden devam et.">
      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        <input data-testid="login-email" type="email" required placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        <input data-testid="login-password" type="password" required placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        <button data-testid="login-submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-ink text-white font-semibold py-3 rounded-xl hover:bg-subject-matematik transition-colors disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <>Giriş yap <ArrowRight size={17} /></>}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-500">
        Hesabın yok mu?{" "}
        <Link to="/register" className="text-subject-matematik font-semibold" data-testid="go-register">Kayıt ol</Link>
      </p>
    </AuthShell>
  );
}
