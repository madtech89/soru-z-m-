import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Flag,
  HelpCircle,
  RotateCcw,
  Sparkles,
  BookOpen,
  X,
  Check,
  ChevronDown,
  Layers,
  Search,
  MessageSquare
} from "lucide-react";
import { fetchUserMistakes, updateMistakeReason, resolveMistake, submitQuestionFeedback } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Spinner, Empty, EASE } from "@/app/ui";
import { toast } from "sonner";

const MISTAKE_REASONS = [
  { id: "bilgi_eksikligi", label: "Bilgi Eksikliği", icon: "🧠", color: "#EF4444" },
  { id: "dikkat_hatasi", label: "Dikkat Hatası", icon: "⚡", color: "#F59E0B" },
  { id: "islem_hatasi", label: "İşlem Hatası", icon: "🔢", color: "#6366F1" },
  { id: "kavram_yanilgisi", label: "Kavram Yanılgısı", icon: "❓", color: "#EC4899" },
  { id: "zaman_yonetimi", label: "Zaman Yetmedi", icon: "⏱️", color: "#14B8A6" },
  { id: "tahmin", label: "Yanlış Tahmin", icon: "🎲", color: "#8B5CF6" },
];

export default function MistakeLedger() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [activeReason, setActiveReason] = useState("all");
  const [showResolved, setShowResolved] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null); // question_id
  const [feedbackReason, setFeedbackReason] = useState("hatali_cevap");
  const [feedbackDesc, setFeedbackDesc] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadMistakes = () => {
    if (!user?.id) return;
    const params = {};
    if (activeReason !== "all") params.reason = activeReason;
    if (!showResolved) params.is_reviewed = false;

    fetchUserMistakes(params)
      .then(setData)
      .catch(() => setData({ total: 0, items: [] }));
  };

  useEffect(() => {
    loadMistakes();
  }, [user?.id, activeReason, showResolved]);

  const handleSetReason = async (answerId, reason) => {
    try {
      await updateMistakeReason(answerId, reason);
      toast.success("Hata nedeni kaydedildi.");
      loadMistakes();
    } catch {
      toast.error("Hata nedeni kaydedilemedi.");
    }
  };

  const handleToggleResolve = async (answerId, currentStatus) => {
    try {
      await resolveMistake(answerId, !currentStatus);
      if (!currentStatus) {
        toast.success("🎉 Harika! Eksik kapatıldı (+10 XP).");
      }
      loadMistakes();
    } catch {
      toast.error("İşlem kaydedilemedi.");
    }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackModal) return;
    setSubmittingFeedback(true);
    try {
      await submitQuestionFeedback(feedbackModal, feedbackReason, feedbackDesc);
      toast.success("Soru hata bildiriminiz editör ekibine iletildi.");
      setFeedbackModal(null);
      setFeedbackDesc("");
    } catch {
      toast.error("Bildirim gönderilemedi.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (data === null) return <Spinner />;

  const items = data.items || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="yanlış defteri & aralıklı tekrar"
        title="Yanlış Defteri & Hata Analizi"
        sub="Denemelerde ve soru bankasında yanlış yaptığın soruları analiz et, hata nedenlerini belirle ve eksiklerini kapat."
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResolved(!showResolved)}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition ${
                showResolved
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {showResolved ? "Kapatılan Eksikleri Gizle" : "Kapatılan Eksikleri Göster"}
            </button>
          </div>
        }
      />

      {/* ─── Filter Tabs ─── */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-zinc-200">
        <button
          onClick={() => setActiveReason("all")}
          className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeReason === "all"
              ? "bg-zinc-900 text-white shadow-sm"
              : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300"
          }`}
        >
          Tüm Yanlışlar ({data.total})
        </button>

        {MISTAKE_REASONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveReason(r.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeReason === r.id
                ? "bg-zinc-900 text-white shadow-sm"
                : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            <span>{r.icon}</span> {r.label}
          </button>
        ))}
      </div>

      {/* ─── Mistakes List ─── */}
      {items.length === 0 ? (
        <Empty text="Harika! Bu filtrede incelenmemiş yanlış sorunuz bulunmuyor." />
      ) : (
        <div className="space-y-4">
          {items.map((item, i) => {
            const q = item.question;
            const currentReasonMeta = MISTAKE_REASONS.find((r) => r.id === item.mistake_reason);

            return (
              <motion.div
                key={item.answer_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3, ease: EASE }}
              >
                <Card className={`p-6 border-2 transition ${item.is_reviewed ? "bg-zinc-50/70 border-zinc-200 opacity-75" : "bg-white border-zinc-200 hover:border-indigo-200 shadow-sm"}`}>
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-150 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-800">{item.subject_name}</span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-zinc-600 font-medium">{item.topic_name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Reason Tag */}
                      {currentReasonMeta ? (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 flex items-center gap-1">
                          {currentReasonMeta.icon} {currentReasonMeta.label}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                          Hata Nedeni Belirlenmedi
                        </span>
                      )}

                      {/* Resolve Checkbox */}
                      <button
                        onClick={() => handleToggleResolve(item.answer_id, item.is_reviewed)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-xs transition ${
                          item.is_reviewed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-700 text-zinc-600"
                        }`}
                      >
                        <Check size={13} /> {item.is_reviewed ? "Eksik Kapatıldı" : "Eksik Kapatıldı Olarak İşaretle"}
                      </button>

                      {/* Hata Bildir Button */}
                      <button
                        onClick={() => setFeedbackModal(item.question_id)}
                        className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
                        title="Soruya Hata Bildir"
                      >
                        <Flag size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <p className="font-heading font-semibold text-sm sm:text-base leading-relaxed text-zinc-900 mb-5 whitespace-pre-wrap">
                    {q.question_text}
                  </p>

                  {/* Options */}
                  <div className="space-y-2 mb-5">
                    {["A", "B", "C", "D", "E"].filter((o) => q[`option_${o.toLowerCase()}`]).map((o) => {
                      const isCorrect = o.toUpperCase() === (q.correct_answer || "").toUpperCase();
                      const isUserSelected = o.toUpperCase() === (item.selected_answer || "").toUpperCase();

                      return (
                        <div
                          key={o}
                          className={`p-3 rounded-xl border flex items-center gap-3 text-xs sm:text-sm font-medium ${
                            isCorrect
                              ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold"
                              : isUserSelected
                              ? "bg-red-50/70 border-red-300 text-red-950 line-through"
                              : "bg-zinc-50/50 border-zinc-200 text-zinc-700"
                          }`}
                        >
                          <span className={`h-6 w-6 rounded-lg grid place-items-center font-bold text-xs ${
                            isCorrect ? "bg-emerald-600 text-white" : isUserSelected ? "bg-red-600 text-white" : "bg-zinc-200 text-zinc-600"
                          }`}>
                            {o}
                          </span>
                          <span className="flex-1">{q[`option_${o.toLowerCase()}`]}</span>
                          {isCorrect && <span className="text-[10px] text-emerald-700 font-bold px-2 py-0.5 bg-emerald-100 rounded">Doğru Cevap</span>}
                          {isUserSelected && !isCorrect && <span className="text-[10px] text-red-700 font-bold px-2 py-0.5 bg-red-100 rounded">Senin Yanıtın</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailed Solution / Explanation */}
                  {q.explanation && (
                    <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-zinc-800 space-y-1 mb-4">
                      <div className="font-bold text-indigo-700 flex items-center gap-1.5">
                        <Sparkles size={14} /> Detaylı Çözüm & Püf Noktası:
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                    </div>
                  )}

                  {/* Bottom: Hata Nedenini Seç */}
                  <div className="pt-3 border-t border-zinc-150 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-zinc-600">Hata Nedenin Nedir?</span>
                      {MISTAKE_REASONS.map((r) => {
                        const isChosen = item.mistake_reason === r.id;
                        return (
                          <button
                            key={r.id}
                            onClick={() => handleSetReason(item.answer_id, r.id)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition ${
                              isChosen
                                ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                                : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
                            }`}
                          >
                            {r.icon} {r.label}
                          </button>
                        );
                      })}
                    </div>

                    <Link
                      to={`/app/ders-notlari?topic_id=${item.question?.topic_id}`}
                      className="font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <BookOpen size={13} /> Konu Ders Notunu Oku
                    </Link>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── Hata Bildir Modal ─── */}
      <AnimatePresence>
        {feedbackModal && (
          <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-base text-zinc-900 flex items-center gap-2">
                  <Flag size={18} className="text-red-500" /> Soruya Hata Bildir
                </h3>
                <button onClick={() => setFeedbackModal(null)}>
                  <X size={18} className="text-zinc-400" />
                </button>
              </div>

              <form onSubmit={handleSendFeedback} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Hata Türü</label>
                  <select
                    value={feedbackReason}
                    onChange={(e) => setFeedbackReason(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs outline-none"
                  >
                    <option value="hatali_cevap">Doğru Cevap Şıkkı Hatalı</option>
                    <option value="yazim_hatasi">Yazım / İfade Hatası</option>
                    <option value="eksik_gorsel">Görsel / Şekil Eksik</option>
                    <option value="mufredat_disi">2026 ÖSYM Müfredat Dışı</option>
                    <option value="cozum_anlasilmiyor">Çözüm Açıklaması Yetersiz</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Açıklama (İsteğe Bağlı)</label>
                  <textarea
                    rows={3}
                    value={feedbackDesc}
                    onChange={(e) => setFeedbackDesc(e.target.value)}
                    placeholder="Gördüğünüz hatayı kısaca açıklayınız..."
                    className="w-full rounded-xl border border-zinc-300 p-3 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackModal(null)}
                    className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 font-bold"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition"
                  >
                    Bildirimi Gönder
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
