import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Save, Zap, Flame, Target, FileCheck, TrendingUp, Award } from "lucide-react";
import { fetchDashboard, updateProfile, fetchUserBadges, getLevelInfo } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, EASE, LoginPrompt } from "@/app/ui";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "", username: user?.username || "",
    target_score: user?.target_score || "", daily_goal: user?.daily_goal || 20,
  });
  const [stats, setStats] = useState(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchDashboard(user.id).then(setStats).catch(() => {});
      fetchUserBadges(user.id).then((b) => setBadgeCount(b.length)).catch(() => {});
    }
  }, [user?.id]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile(user.id, {
        name: form.name, username: form.username,
        target_score: form.target_score ? Number(form.target_score) : null,
        daily_goal: Number(form.daily_goal),
      });
      updateUser({ ...user, ...updated, email: user.email });
      toast.success("Profil güncellendi!");
    } catch { toast.error("Kaydedilemedi."); }
    finally { setSaving(false); }
  };

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 outline-none focus:border-subject-matematik transition";

  const levelInfo = getLevelInfo(user?.xp || 0);

  if (!user) return <LoginPrompt title="Profilin için giriş yap" message="Bilgilerini düzenlemek, istatistiklerini ve rozetlerini görmek için giriş yap." />;

  const statItems = stats ? [
    { icon: FileCheck, label: "Çözülen Soru", value: stats.total_solved, color: "#4F46E5" },
    { icon: Target, label: "Deneme", value: stats.total_tests, color: "#10B981" },
    { icon: Zap, label: "XP", value: stats.xp, color: "#F59E0B" },
    { icon: TrendingUp, label: "Seviye", value: levelInfo.level, color: "#EC4899" },
    { icon: Flame, label: "Seri", value: `${stats.streak} gün`, color: "#F43F5E" },
    { icon: Award, label: "Rozet", value: badgeCount, color: "#6366F1" },
  ] : [];

  return (
    <div>
      <PageHeader eyebrow="profil" title="Profilim" />

      <div className="grid lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}>
          <Card className="p-6 text-center">
            <div className="h-20 w-20 rounded-2xl bg-subject-matematik/15 grid place-items-center font-heading font-extrabold text-3xl text-subject-matematik mx-auto">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="font-heading font-bold text-xl mt-4">{user?.name}</div>
            <div className="text-sm text-zinc-400">@{user?.username}</div>
            <div className="text-xs text-zinc-400 mt-1">{user?.email}</div>
            {user?.role === "admin" && <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-ink text-white">Admin</span>}
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, ease: EASE }}>
          <Card className="p-6">
            <h3 className="font-heading font-bold text-lg mb-4">Bilgilerim</h3>
            <form onSubmit={save} className="grid sm:grid-cols-2 gap-4" data-testid="profile-form">
              <div>
                <label className="text-sm text-zinc-500">Ad Soyad</label>
                <input data-testid="profile-name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-sm text-zinc-500">Kullanıcı adı</label>
                <input data-testid="profile-username" value={form.username} onChange={(e) => set("username", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-sm text-zinc-500">Hedef puan</label>
                <input data-testid="profile-target" type="number" value={form.target_score} onChange={(e) => set("target_score", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-sm text-zinc-500">Günlük soru hedefi</label>
                <input data-testid="profile-goal" type="number" value={form.daily_goal} onChange={(e) => set("daily_goal", e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <button data-testid="profile-save" disabled={saving} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-subject-matematik transition-colors disabled:opacity-60">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Kaydet
                </button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
        {statItems.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05, ease: EASE }}>
            <Card className="p-5">
              <span className="h-9 w-9 rounded-lg grid place-items-center mb-2" style={{ background: `${s.color}18` }}>
                <s.icon size={16} style={{ color: s.color }} />
              </span>
              <div className="font-heading font-extrabold text-2xl" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-zinc-500">{s.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-5">
        <Link to="/app/rozetler" className="flex items-center justify-center gap-2 bg-subject-ai/10 text-subject-ai font-semibold py-3 rounded-xl hover:bg-subject-ai/20 transition-colors">
          <Award size={18} /> Tüm rozetleri ve seviyeyi gör
        </Link>
      </div>
    </div>
  );
}
