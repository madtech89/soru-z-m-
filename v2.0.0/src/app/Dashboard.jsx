import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Flame, Zap, Target, TrendingUp, CheckCircle2, ArrowRight, Brain, FileText } from "lucide-react";
import { fetchDashboard } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { statusColor } from "@/lib/subjects";
import { Card, StatCard, Spinner, EASE, LoginPrompt } from "@/app/ui";

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);

  useEffect(() => {
    if (user?.id) fetchDashboard(user.id).then(setD).catch(() => setD(false));
  }, [user?.id]);

  if (!user) return <LoginPrompt title="Ana sayfanı gör" message="Kişisel istatistiklerin, hedeflerin ve AI önerilerin için ücretsiz hesap oluştur." />;
  if (d === null) return <Spinner />;
  if (!d) return <p className="text-zinc-500">Veri yüklenemedi.</p>;

  const goalPct = Math.min(100, Math.round((d.solved_today / Math.max(1, d.daily_goal)) * 100));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="font-editorial italic text-subject-matematik mb-1">— hoş geldin</div>
          <h1 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">
            Merhaba, {(user?.name || "").split(" ")[0]} 👋
          </h1>
        </div>
        <div className="flex gap-3">
          <span className="flex items-center gap-2 bg-subject-sosyal/10 text-subject-sosyal font-semibold px-4 py-2 rounded-full text-sm"><Flame size={16} /> {d.streak} gün seri</span>
          <span className="flex items-center gap-2 bg-subject-matematik/10 text-subject-matematik font-semibold px-4 py-2 rounded-full text-sm"><Zap size={16} /> {d.xp} XP</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="lg:col-span-2">
          <Card className="p-7 h-full relative overflow-hidden">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-subject-matematik/10" />
            <div className="relative">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1"><Target size={16} className="text-subject-matematik" /> Bugünkü Hedef</div>
              <div className="flex items-end gap-3 mb-5">
                <span className="font-heading font-extrabold text-5xl">{d.solved_today}</span>
                <span className="text-zinc-400 mb-2">/ {d.daily_goal} soru</span>
              </div>
              <div className="h-3 rounded-full bg-zinc-100 overflow-hidden">
                <motion.div className="h-full rounded-full bg-subject-matematik" initial={{ width: 0 }} animate={{ width: `${goalPct}%` }} transition={{ duration: 0.9, ease: EASE }} />
              </div>
              <div className="flex items-center justify-between mt-3 text-sm">
                <span className="text-zinc-500">%{goalPct} tamamlandı</span>
                <Link to="/app/soru-bankasi" className="text-subject-matematik font-semibold flex items-center gap-1">Soru çöz <ArrowRight size={15} /></Link>
              </div>
            </div>
          </Card>
        </motion.div>

        <StatCard label="Bugünkü Başarı" value={`%${d.success_today}`} hint="doğru oranı" color="#10B981" icon={CheckCircle2} delay={0.05} testid="stat-success-today" />
        <StatCard label="Ortalama Puan" value={d.avg_score} hint={`${d.total_tests} deneme`} color="#4F46E5" icon={TrendingUp} delay={0.1} testid="stat-avg-score" />
        <StatCard label="Genel Başarı" value={`%${d.overall_success}`} hint="tüm zamanlar" color="#F59E0B" icon={Target} delay={0.15} testid="stat-overall" />
        <StatCard label="Çözülen Soru" value={d.total_solved} hint="toplam" color="#F43F5E" icon={Zap} delay={0.2} testid="stat-total-solved" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-5">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5, ease: EASE }} className="lg:col-span-2">
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">Son 7 Gün Gelişimi</h3>
              <span className="text-xs text-zinc-400">çözülen soru</span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.series} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4F46E5" stopOpacity={0.35} /><stop offset="100%" stopColor="#4F46E5" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#a1a1aa" }} interval={0} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 13 }} />
                  <Area type="monotone" dataKey="solved" stroke="#4F46E5" strokeWidth={2.5} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5, ease: EASE }}>
          <Card className="p-6 h-full bg-subject-ai/5 border-subject-ai/20 flex flex-col">
            <span className="h-10 w-10 rounded-xl bg-subject-ai/15 grid place-items-center mb-4"><Brain size={19} className="text-subject-ai" /></span>
            <h3 className="font-heading font-bold text-lg">AI Koç önerisi</h3>
            <p className="text-sm text-zinc-500 mt-2 flex-1">
              {d.weak_topics[0] ? `${d.weak_topics[0].topic_name} konusunda başarın %${d.weak_topics[0].proficiency}. Önce ders notunu incele, ardından 20 soru çöz.` : "Birkaç deneme çöz, kişisel önerini oluşturalım."}
            </p>
            <Link to="/app/ai-koc" className="mt-4 text-subject-ai font-semibold text-sm flex items-center gap-1">AI Koç'a git <ArrowRight size={15} /></Link>
          </Card>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-lg">Zayıf Konuların</h3>
            <Link to="/app/eksiklerim" className="text-sm text-subject-matematik font-semibold">Tümü</Link>
          </div>
          <div className="space-y-4">
            {d.weak_topics.length === 0 && <p className="text-sm text-zinc-400">Harika, kritik eksik konun yok!</p>}
            {d.weak_topics.map((t) => (
              <div key={t.topic_id}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium">{t.topic_name} <span className="text-zinc-400">· {t.subject_name}</span></span>
                  <span className="font-semibold" style={{ color: statusColor(t.status) }}>%{t.proficiency}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: statusColor(t.status) }} initial={{ width: 0 }} whileInView={{ width: `${t.proficiency}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-lg">Önerilen Denemeler</h3>
            <Link to="/app/denemeler" className="text-sm text-subject-matematik font-semibold">Tümü</Link>
          </div>
          <div className="space-y-3">
            {d.recommended_tests.length === 0 && <p className="text-sm text-zinc-400">Önce sınavını seç.</p>}
            {d.recommended_tests.map((t) => (
              <Link key={t.id} to={`/app/deneme/${t.id}`} className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:border-subject-matematik hover:bg-subject-matematik/5 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-lg bg-subject-matematik/10 grid place-items-center"><FileText size={16} className="text-subject-matematik" /></span>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-zinc-400">{(t.question_ids || []).length || t.question_count || 0} soru · {t.duration_minutes} dk</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-zinc-300 group-hover:text-subject-matematik group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
