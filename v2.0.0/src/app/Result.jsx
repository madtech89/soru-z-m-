import { useState, useEffect } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Check, X, Minus, Target, ArrowRight, RotateCcw, Search,
  Sparkles, Brain, AlertTriangle, CheckCircle2, Calendar, BookOpen,
  TrendingUp, RefreshCw, Clock
} from "lucide-react";
import { Card, Spinner, EASE } from "@/app/ui";
import { analyzeExamPerformanceAI } from "@/lib/api";

export default function Result() {
  const { state } = useLocation();
  const r = state?.result;

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAi, setLoadingAi] = useState(true);

  useEffect(() => {
    if (r) {
      setLoadingAi(true);
      analyzeExamPerformanceAI({
        result_id: r.id || r.session_id,
        test_id: r.test_id,
        total: r.total || (r.correct + r.wrong + r.blank),
        correct: r.correct,
        wrong: r.wrong,
        blank: r.blank,
        net: r.net,
        test_name: r.test_name || "Deneme Sınavı",
        sections: r.section_breakdown || {},
      })
        .then((res) => {
          if (res?.diagnosis) setAiAnalysis(res.diagnosis);
        })
        .catch(() => {})
        .finally(() => setLoadingAi(false));
    }
  }, [r]);

  if (!r) return <Navigate to="/app/denemeler" replace />;

  const items = [
    { label: "Doğru", value: r.correct, color: "#10B981", icon: Check },
    { label: "Yanlış", value: r.wrong, color: "#F43F5E", icon: X },
    { label: "Boş", value: r.blank, color: "#A1A1AA", icon: Minus },
    { label: "Net", value: r.net, color: "#4F46E5", icon: Target },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Puan ve Sonuç Kartı */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: EASE }}>
        <Card className="p-8 text-center relative overflow-hidden bg-white shadow-xl">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-subject-matematik/10 blur-xl" />
          <div className="relative">
            <span className="inline-grid place-items-center h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 mb-3 border border-amber-200">
              <Trophy size={32} />
            </span>
            <div className="text-sm font-semibold text-zinc-500">{r.test_name || "Genel Deneme Sınavı"}</div>
            <div className="font-heading font-extrabold text-5xl sm:text-6xl mt-2 text-subject-matematik" data-testid="result-score">
              {r.score ? r.score.toFixed(1) : r.net} <span className="text-2xl font-bold text-zinc-400">Puan</span>
            </div>
            <div className="text-zinc-500 font-medium mt-1">
              Başarı Oranı: <strong>%{r.success_rate || Math.round((r.correct / (r.total || 1)) * 100)}</strong>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Doğru / Yanlış / Boş / Net Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {items.map((it, i) => (
          <motion.div key={it.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04, ease: EASE }}>
            <Card className="p-4 text-center" data-testid={`result-${it.label}`}>
              <span className="inline-grid place-items-center h-9 w-9 rounded-xl mb-2" style={{ background: `${it.color}15` }}>
                <it.icon size={18} style={{ color: it.color }} />
              </span>
              <div className="font-heading font-extrabold text-2xl" style={{ color: it.color }}>{it.value}</div>
              <div className="text-xs font-bold text-zinc-500 mt-0.5">{it.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 🚀 CANLI GELİŞİM & İLERLEME KARŞILAŞTIRMA KARTI */}
      {r.comparison && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease: EASE }}>
          <Card className={`p-6 sm:p-7 border-2 ${
            r.comparison.status_type === "improved"
              ? "bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white border-emerald-300 shadow-lg shadow-emerald-100"
              : r.comparison.status_type === "declined"
              ? "bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-white border-amber-300 shadow-lg shadow-amber-100"
              : "bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white border-indigo-200 shadow-lg shadow-indigo-100"
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-extrabold ${
                    r.comparison.status_type === "improved"
                      ? "bg-emerald-600 text-white"
                      : r.comparison.status_type === "declined"
                      ? "bg-amber-600 text-white"
                      : "bg-indigo-600 text-white"
                  }`}>
                    <TrendingUp size={13} />
                    {r.comparison.is_first_attempt
                      ? "İLK DENEME BAŞARISI"
                      : r.comparison.net_diff > 0
                      ? `NET ARTIŞI: +${r.comparison.net_diff} NET (%${Math.abs(r.comparison.pct_change)})`
                      : r.comparison.net_diff === 0
                      ? "NET KORUNDU"
                      : `DEĞİŞİM: ${r.comparison.net_diff} NET (%${Math.abs(r.comparison.pct_change)})`}
                  </span>
                  <span className="text-xs text-zinc-500 font-medium">
                    Gelişim Takip Motoru
                  </span>
                </div>

                <p className="font-heading font-bold text-base sm:text-lg text-ink leading-snug">
                  {r.comparison.progress_message}
                </p>
              </div>

              {!r.comparison.is_first_attempt && (
                <div className="flex items-center gap-3 self-stretch md:self-center justify-center p-3 rounded-2xl bg-white/80 border border-zinc-200 backdrop-blur-sm shadow-sm shrink-0">
                  <div className="text-center px-3">
                    <div className="text-[11px] font-semibold text-zinc-500">Önceki Net</div>
                    <div className="font-heading font-black text-xl text-zinc-700">{r.comparison.previous_net}</div>
                  </div>
                  <div className="text-zinc-300 font-bold text-xl">→</div>
                  <div className="text-center px-3">
                    <div className="text-[11px] font-semibold text-zinc-500">Şimdiki Net</div>
                    <div className={`font-heading font-black text-xl ${
                      r.comparison.net_diff > 0 ? "text-emerald-600" : r.comparison.net_diff < 0 ? "text-amber-600" : "text-indigo-600"
                    }`}>
                      {r.comparison.current_net}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* YAPAY ZEKÂ DERİN DENEME VE EKSİK ANALİZİ (100 ÜZERİNDEN SKOR) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease: EASE }}>

        <Card className="p-6 sm:p-8 bg-gradient-to-br from-indigo-950 via-zinc-900 to-zinc-950 text-white rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-subject-matematik/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-subject-matematik text-white grid place-items-center shadow-lg shadow-subject-matematik/30">
                  <Brain size={22} />
                </span>
                <div>
                  <h3 className="font-heading font-extrabold text-lg sm:text-xl text-white flex items-center gap-2">
                    Yapay Zekâ Sınav Teşhis & Performans Raporu
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Girdiğin denemenin soru, konu ve branş bazlı yapay zekâ analiz sonuçları
                  </p>
                </div>
              </div>

              {aiAnalysis && (
                <div className="text-right bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10">
                  <div className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider">AI Yeterlilik Puanı</div>
                  <div className="font-heading font-extrabold text-2xl text-emerald-400">
                    {aiAnalysis.readiness_score} <span className="text-xs font-normal text-white">/ 100</span>
                  </div>
                </div>
              )}
            </div>

            {loadingAi ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw size={28} className="animate-spin mx-auto text-indigo-400" />
                <div className="text-sm font-semibold text-indigo-200">
                  Yapay zekâ sınavdaki yanlış ve doğrularınızı analiz ediyor...
                </div>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-6">
                {/* Genel AI Değerlendirmesi */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 leading-relaxed text-xs sm:text-sm text-indigo-100 italic">
                  "{aiAnalysis.evaluation}"
                </div>

                {/* Kritik Eksikler & Güçlü Yönler */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Eksikler */}
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3">
                    <div className="font-heading font-bold text-xs uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle size={15} /> Kritik Eksik Konular
                    </div>
                    <div className="space-y-2">
                      {(aiAnalysis.critical_weaknesses || []).map((w, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-black/30 text-xs space-y-0.5">
                          <div className="font-bold text-rose-200 flex items-center justify-between">
                            <span>{w.topic}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">{w.urgency || "Yüksek"}</span>
                          </div>
                          <div className="text-[11px] text-zinc-300">{w.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Güçlü Yönler */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                    <div className="font-heading font-bold text-xs uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={15} /> Güçlü & Hakim Olduğun Alanlar
                    </div>
                    <div className="space-y-2">
                      {(aiAnalysis.strengths || []).map((s, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-black/30 text-xs space-y-0.5">
                          <div className="font-bold text-emerald-200">{s.topic}</div>
                          <div className="text-[11px] text-zinc-300">{s.praise}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 7 Günlük Kişiselleştirilmiş Kurtarma Eylem Planı */}
                {aiAnalysis.action_plan_7days && (
                  <div className="space-y-3 pt-2">
                    <div className="font-heading font-bold text-xs uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <Calendar size={15} /> 7 Günlük Kişisel Eylem & Gelişim Planı
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      {aiAnalysis.action_plan_7days.map((plan, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1">
                          <div className="font-bold text-[11px] text-indigo-300">{plan.day_name || `${plan.day}. Gün`}</div>
                          <div className="text-[11px] text-white font-semibold line-clamp-2">{plan.focus}</div>
                          <div className="text-[10px] text-zinc-400 mt-1">{plan.task}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stratejik Tavsiye */}
                {aiAnalysis.strategic_advice && (
                  <div className="p-3.5 rounded-2xl bg-subject-matematik/20 border border-subject-matematik/30 text-xs text-indigo-100 flex items-start gap-2.5">
                    <Sparkles size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">AI Koç Strateji Tavsiyesi:</strong> {aiAnalysis.strategic_advice}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </Card>
      </motion.div>

      {/* Aksiyon Butonları */}
      <div className="grid sm:grid-cols-3 gap-3 pt-2">
        <Link
          to={`/app/incele/${r.test_id}/${r.session_id}`}
          state={{ result: r, sessionId: r.session_id }}
          data-testid="result-review"
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-3.5 rounded-2xl hover:bg-emerald-700 transition shadow-md text-xs sm:text-sm"
        >
          <Search size={16} /> Çözümleri İncele
        </Link>
        <Link
          to="/app/yanlislarim"
          data-testid="result-mistakes"
          className="flex items-center justify-center gap-2 bg-rose-600 text-white font-bold py-3.5 rounded-2xl hover:bg-rose-700 transition shadow-md text-xs sm:text-sm"
        >
          <RotateCcw size={16} /> Yanlış Defterime Git
        </Link>
        <Link
          to="/app/eksiklerim"
          data-testid="result-weak"
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition shadow-md text-xs sm:text-sm"
        >
          Eksik Konularım <ArrowRight size={16} />
        </Link>
      </div>

      <Link
        to="/app/denemeler"
        data-testid="result-again"
        className="flex items-center justify-center gap-2 border border-zinc-300 bg-white font-bold text-xs sm:text-sm py-3 rounded-2xl hover:border-ink transition"
      >
        <RotateCcw size={15} /> Yeni Deneme Sınavı Çöz
      </Link>
    </div>
  );
}
