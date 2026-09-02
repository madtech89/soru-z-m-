import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Clock,
  CheckCircle2,
  Sparkles,
  Zap,
  RotateCcw,
  Target
} from "lucide-react";
import { fetchWeakTopicsData } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Spinner, Empty, EASE } from "@/app/ui";
import { statusColor, tone } from "@/lib/subjects";

export default function WeakTopics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // all, critical, improvement, strong

  useEffect(() => {
    if (user?.id) {
      fetchWeakTopicsData(user.id)
        .then(setData)
        .catch(() => setData({ topics: [], critical: [], improvement: [], good: [], strong: [] }));
    }
  }, [user?.id]);

  if (data === null) return <Spinner />;

  const allTopics = data.topics || [];
  const critical = data.critical || [];
  const improvement = data.improvement || [];
  const strong = [...(data.good || []), ...(data.strong || [])];

  const displayedTopics =
    activeTab === "critical"
      ? critical
      : activeTab === "improvement"
      ? improvement
      : activeTab === "strong"
      ? strong
      : allTopics;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ölçme & yeterlilik motoru"
        title="Eksiklerim & Konu Yeterlilik Skorum"
        sub="Soru zorluğu, çözüm süresi, hata nedenleri ve unutma eğrisine göre hesaplanan bilimsel konu yeterlilik analizlerin."
        right={
          <Link
            to="/app/yanlislarim"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-indigo-600 transition shadow-sm"
          >
            <RotateCcw size={14} /> Yanlış Defterime Git
          </Link>
        }
      />

      {/* ─── Metric Summary Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-red-100 bg-red-50/30 text-center">
          <div className="text-[11px] font-bold text-red-600">Kritik Eksikler</div>
          <div className="font-heading font-extrabold text-2xl text-red-700 mt-1">{critical.length} Konu</div>
          <div className="text-[10px] text-red-500 mt-0.5">%0 - %39 Başarı</div>
        </Card>

        <Card className="p-4 border-amber-100 bg-amber-50/30 text-center">
          <div className="text-[11px] font-bold text-amber-600">Geliştirilmeli</div>
          <div className="font-heading font-extrabold text-2xl text-amber-700 mt-1">{improvement.length} Konu</div>
          <div className="text-[10px] text-amber-500 mt-0.5">%40 - %64 Başarı</div>
        </Card>

        <Card className="p-4 border-emerald-100 bg-emerald-50/30 text-center">
          <div className="text-[11px] font-bold text-emerald-600">Güçlü Konular</div>
          <div className="font-heading font-extrabold text-2xl text-emerald-700 mt-1">{strong.length} Konu</div>
          <div className="text-[10px] text-emerald-500 mt-0.5">%65+ Başarı</div>
        </Card>

        <Card className="p-4 border-zinc-200 text-center">
          <div className="text-[11px] font-bold text-zinc-500">Ölçülen Toplam</div>
          <div className="font-heading font-extrabold text-2xl text-zinc-900 mt-1">{allTopics.length} Konu</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Aktif analiz</div>
        </Card>
      </div>

      {/* ─── Filter Tabs ─── */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-zinc-200">
        {[
          { id: "all", label: `Tüm Konular (${allTopics.length})` },
          { id: "critical", label: `Kritik Eksikler (${critical.length})` },
          { id: "improvement", label: `Geliştirilmeli (${improvement.length})` },
          { id: "strong", label: `Güçlü Konular (${strong.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === tab.id
                ? "bg-zinc-900 text-white shadow-sm"
                : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Topics List ─── */}
      {displayedTopics.length === 0 ? (
        <Empty text="Bu kategoride henüz incelenecek konu bulunmuyor. Birkaç soru veya deneme çözdükçe burası otomatik güncellenir." />
      ) : (
        <div className="space-y-3">
          {displayedTopics.map((t, i) => {
            const sc = t.status_color || statusColor(t.status);
            const tn = tone(t.subject_slug);
            return (
              <motion.div
                key={t.topic_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3, ease: EASE }}
              >
                <Card className="p-5 border-zinc-200 hover:border-indigo-200 transition shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: tn.hex }} />
                        <span className="font-heading font-bold text-sm text-zinc-900">{t.topic_name}</span>
                        <span className="text-xs text-zinc-400 font-medium">· {t.subject_name}</span>
                        
                        {/* Confidence Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.confidence === "high"
                            ? "bg-emerald-50 text-emerald-700"
                            : t.confidence === "medium"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {t.confidence_label || "Ölçüm Güveni"}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-3 flex-wrap">
                        <span>{t.total_solved || t.total} soru çözüldü</span>
                        <span>· {t.correct_count || t.correct} doğru</span>
                        <span>· {t.wrong_count || t.wrong} yanlış</span>
                        <span>· ort. {t.avg_time || 45}sn/soru</span>
                        {t.forgetting_risk && t.forgetting_risk !== "Düşük" && (
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <Clock size={11} /> Unutma Riski: {t.forgetting_risk}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="font-heading font-extrabold text-2xl" style={{ color: sc }}>
                          %{t.proficiency}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: sc }}>
                          {t.status}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 rounded-full bg-zinc-100 overflow-hidden mt-3">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: sc }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${t.proficiency}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, ease: EASE }}
                    />
                  </div>

                  {/* Next Action & Confidence Hint */}
                  <div className="mt-3.5 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <p className="text-zinc-600 font-medium">
                      💡 <strong className="text-zinc-800">Önerilen Eylem:</strong> {t.next_action || "Ders notunu incele ve 15 soru çöz."}
                      {t.confidence_hint && (
                        <span className="text-zinc-400 block sm:inline sm:ml-2">({t.confidence_hint})</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/app/ders-notlari?topic_id=${t.topic_id}`}
                        className="flex items-center gap-1 font-bold text-xs hover:underline"
                        style={{ color: tn.hex }}
                      >
                        <BookOpen size={13} /> Ders Notu
                      </Link>
                      <Link
                        to="/app/soru-bankasi"
                        className="flex items-center gap-1 font-bold text-xs bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg text-zinc-800 transition"
                      >
                        <Target size={13} /> Soru Çöz <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
