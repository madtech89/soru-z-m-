import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { AuthShell } from "@/pages/Login";

const inputCls =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-subject-matematik focus:ring-2 focus:ring-subject-matematik/20 transition";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Hesabın oluşturuldu!");
      nav("/app/sinavlar");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Yolculuğa başla" subtitle="Ücretsiz hesap oluştur, sınavını seç, ilk denemeni çöz.">
      <form onSubmit={submit} className="space-y-4" data-testid="register-form">
        <input data-testid="register-name" required placeholder="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        <input data-testid="register-email" type="email" required placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        <input data-testid="register-password" type="password" required placeholder="Şifre (en az 6 karakter)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        <button data-testid="register-submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-ink text-white font-semibold py-3 rounded-xl hover:bg-subject-matematik transition-colors disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <>Hesap oluştur <ArrowRight size={17} /></>}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-500">
        Zaten hesabın var mı?{" "}
        <Link to="/login" className="text-subject-matematik font-semibold" data-testid="go-login">Giriş yap</Link>
      </p>
    </AuthShell>
  );
}
