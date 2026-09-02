import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  Flame,
  Zap,
  Target,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Brain,
  FileText,
  Clock,
  Check,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Play
} from "lucide-react";
import { fetchDashboard } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { statusColor } from "@/lib/subjects";
import { Card, StatCard, Spinner, EASE, LoginPrompt } from "@/app/ui";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [completedTasks, setCompletedTasks] = useState({});

  useEffect(() => {
    if (user?.id) {
      fetchDashboard(user.id)
        .then((data) => {
          setD(data);
          // Initialize completed tasks from localStorage
          try {
            const saved = localStorage.getItem(`hedefmatik_tasks_${user.id}_${new Date().toISOString().split("T")[0]}`);
            if (saved) setCompletedTasks(JSON.parse(saved));
          } catch (_) {}
        })
        .catch(() => setD(false));
    }
  }, [user?.id]);

  const toggleTask = (taskId) => {
    setCompletedTasks((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      try {
        localStorage.setItem(
          `hedefmatik_tasks_${user.id}_${new Date().toISOString().split("T")[0]}`,
          JSON.stringify(next)
        );
      } catch (_) {}
      if (next[taskId]) {
        toast.success("Tebrikler! Görevi tamamladın 🎉 (+25 XP)");
      }
      return next;
    });
  };

  if (!user) {
    return (
      <LoginPrompt
        title="Bugünün Planını Gör"
        message="Kişisel çalışma yol haritan, eksik konuların ve AI koçunun günlük görevleri için ücretsiz giriş yap."
      />
    );
  }

  if (d === null) return <Spinner />;
  if (!d) return <p className="text-zinc-500 text-center py-12">Veri yüklenemedi.</p>;

  const goalPct = Math.min(100, Math.round((d.solved_today / Math.max(1, d.daily_goal)) * 100));
  const tasks = d.today_tasks || [];
  const completedTaskCount = tasks.filter((t) => completedTasks[t.id]).length;

  return (
    <div className="space-y-6">
      {/* ─── Top Header Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-editorial italic text-indigo-600 text-sm">— bugünün planı</span>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
              {d.target_exam_name || "YKS TYT"}
            </span>
          </div>
          <h1 className="font-heading font-extrabold tracking-tight text-2xl sm:text-3xl text-zinc-900 mt-0.5">
            Merhaba, {(user?.name || "").split(" ")[0]} 👋
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 font-bold px-3.5 py-1.5 rounded-full text-xs">
            <Flame size={15} className="text-amber-600" /> {d.streak} Gün Seri
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-bold px-3.5 py-1.5 rounded-full text-xs">
            <Zap size={15} className="text-indigo-600" /> {d.xp} XP
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900 text-white font-bold px-3.5 py-1.5 rounded-full text-xs">
            <Clock size={14} /> {d.days_until_exam} Gün Kaldı
          </div>
        </div>
      </div>

      {/* ─── AI Koç Günlük Değerlendirmesi ─── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
        <Card className="p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white border-none shadow-lg shadow-indigo-900/15 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
            <div className="flex items-start gap-3.5">
              <span className="h-10 w-10 rounded-2xl bg-white/15 grid place-items-center shrink-0 text-amber-300">
                <Brain size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-sm text-amber-300">AI Koç Günlük Tavsiyesi</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-white/10 rounded-full">Kişiselleştirilmiş</span>
                </div>
                <p className="text-xs text-indigo-100 mt-1 leading-relaxed max-w-2xl font-medium">
                  {d.ai_coach_tip}
                </p>
              </div>
            </div>
            <Link
              to="/app/ai-koc"
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-950 font-bold text-xs hover:bg-indigo-50 transition shadow-sm"
            >
              Koçla Konuş <ChevronRight size={14} />
            </Link>
          </div>
        </Card>
      </motion.div>

      {/* ─── Main Grid: Bugünün Görevleri & Hedef Özeti ─── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sol Kolon (2 Sütun): Bugünün Görev Listesi */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-lg text-zinc-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-indigo-600" /> Bugünün Görevleri
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Günlük çalışma kapasitene göre dengelendi ({completedTaskCount}/{tasks.length} tamamlandı)
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600">
              %{Math.round((completedTaskCount / Math.max(1, tasks.length)) * 100)} Tamamlandı
            </span>
          </div>

          <div className="space-y-3">
            {tasks.map((task, i) => {
              const isDone = completedTasks[task.id];
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <Card
                    className={`p-4 transition-all border-2 ${
                      isDone
                        ? "bg-zinc-50/80 border-zinc-200 opacity-75"
                        : "bg-white border-zinc-200 hover:border-indigo-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`mt-0.5 sm:mt-0 h-6 w-6 rounded-lg grid place-items-center transition shrink-0 ${
                            isDone
                              ? "bg-emerald-600 text-white"
                              : "border-2 border-zinc-300 hover:border-indigo-600 text-transparent"
                          }`}
                        >
                          <Check size={14} />
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold text-xs sm:text-sm ${isDone ? "line-through text-zinc-400" : "text-zinc-900"}`}>
                              {task.title}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded">
                              {task.subject}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {task.reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
                          <Clock size={12} /> {task.duration_minutes} dk
                        </span>
                        <Link
                          to={task.action_url}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
                        >
                          <Play size={11} /> Başlat
                        </Link>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Haftalık Gelişim Grafiği */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base text-zinc-900">Son 7 Günün Soru Çözüm Grafiği</h3>
                <span className="text-xs text-zinc-500">Günlük çözülen soru sayısı trendi</span>
              </div>
              <span className="text-xs font-bold text-indigo-600">{d.total_solved} Toplam Soru</span>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.series} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a1a1aa" }} interval={0} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 12 }} />
                  <Area type="monotone" dataKey="solved" stroke="#4F46E5" strokeWidth={2.5} fill="url(#chartGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Sağ Kolon (1 Sütun): İstatistikler & Eksik Konular */}
        <div className="space-y-4">
          {/* Günlük Hedef Kartı */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-500 flex items-center gap-1.5">
                <Target size={15} className="text-indigo-600" /> Günlük Soru Hedefi
              </span>
              <span className="text-xs font-extrabold text-indigo-600">%{goalPct}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-heading font-extrabold text-3xl text-zinc-900">{d.solved_today}</span>
              <span className="text-xs text-zinc-400 font-medium">/ {d.daily_goal} soru</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${goalPct}%` }}
                transition={{ duration: 0.8, ease: EASE }}
              />
            </div>
          </Card>

          {/* Hızlı İstatistikler */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <div className="text-[11px] font-bold text-zinc-500">Bugünkü Başarı</div>
              <div className="font-heading font-extrabold text-2xl text-emerald-600 mt-1">%{d.success_today}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">doğru oranı</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-[11px] font-bold text-zinc-500">Ortalama Puan</div>
              <div className="font-heading font-extrabold text-2xl text-indigo-600 mt-1">{d.avg_score}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">{d.total_tests} deneme</div>
            </Card>
          </div>

          {/* Kritik Eksikler */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-sm text-zinc-900 flex items-center gap-1.5">
                <Target size={15} className="text-red-500" /> Zayıf Konuların
              </h3>
              <Link to="/app/eksiklerim" className="text-[11px] text-indigo-600 font-bold hover:underline">
                Tümü
              </Link>
            </div>
            <div className="space-y-3">
              {(d.weak_topics || []).length === 0 && (
                <p className="text-xs text-zinc-400 py-2">Harika, henüz kritik eksik konun yok!</p>
              )}
              {(d.weak_topics || []).slice(0, 4).map((t) => (
                <div key={t.topic_id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-zinc-800 truncate max-w-[170px]">{t.topic_name}</span>
                    <span className="font-bold text-[11px]" style={{ color: statusColor(t.status) }}>
                      %{t.proficiency}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: statusColor(t.status) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${t.proficiency}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Önerilen Deneme */}
          {d.recommended_tests?.[0] && (
            <Card className="p-5 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 border-indigo-100">
              <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-600 mb-1">
                <Sparkles size={14} /> Haftalık Deneme Vakti
              </div>
              <h4 className="font-heading font-bold text-sm text-zinc-900">{d.recommended_tests[0].name}</h4>
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{d.recommended_tests[0].description}</p>
              <Link
                to={`/app/deneme/${d.recommended_tests[0].id}`}
                className="mt-3 w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs shadow-md shadow-indigo-600/15 transition"
              >
                Denemeyi Başlat <ArrowRight size={14} />
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
