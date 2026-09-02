import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  ListChecks,
  Sparkles,
  Trophy,
  ArrowRight,
  Target,
  UserPlus,
  LogIn,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Calendar,
  Layers
} from "lucide-react";
import { createPlacementTest, evaluatePlacementTest, savePlacementResult } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { statusColor } from "@/lib/subjects";
import { Card, EASE } from "@/app/ui";
import { toast } from "sonner";

const OPTS = ["A", "B", "C", "D", "E"];

// Client-side fallback evaluator in case offline/disconnect
function computePlacementResultLocal(test, answers) {
  const questions = test.questions || [];
  let correct = 0;
  let wrong = 0;
  let blank = 0;

  const subjectMap = {};
  const topicMap = {};

  questions.forEach((q) => {
    const userAns = (answers[q.id] || "").trim().toUpperCase();
    const isBlank = !userAns;
    const isCorrect = !isBlank && userAns === (q.correct_answer || "").trim().toUpperCase();

    if (isCorrect) correct++;
    else if (isBlank) blank++;
    else wrong++;

    // Subject stats
    const sName = q.subject_name || "Genel";
    if (!subjectMap[sName]) subjectMap[sName] = { name: sName, total: 0, correct: 0, wrong: 0, blank: 0 };
    subjectMap[sName].total++;
    if (isCorrect) subjectMap[sName].correct++;
    else if (isBlank) subjectMap[sName].blank++;
    else subjectMap[sName].wrong++;

    // Topic stats
    const tName = q.topic_name || sName;
    if (!topicMap[tName]) topicMap[tName] = { name: tName, subject: sName, total: 0, correct: 0, wrong: 0, blank: 0 };
    topicMap[tName].total++;
    if (isCorrect) topicMap[tName].correct++;
    else if (isBlank) topicMap[tName].blank++;
    else topicMap[tName].wrong++;
  });

  const total = questions.length || 1;
  const net = Math.max(0, Number((correct - wrong * 0.25).toFixed(2)));
  const successRate = Math.round((correct / total) * 100);
  const score = Math.round(100 + (net / total) * 400);

  const weakTopics = Object.values(topicMap)
    .map((t) => {
      const pct = Math.round((t.correct / t.total) * 100);
      return {
        name: t.name,
        subject: t.subject,
        total: t.total,
        correct: t.correct,
        percentage: pct,
        status: pct < 40 ? "critical" : pct < 75 ? "moderate" : "strong",
      };
    })
    .filter((t) => t.percentage < 75)
    .sort((a, b) => a.percentage - b.percentage);

  const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  const roadmap = days.map((day, i) => {
    const targetWeak = weakTopics[i % Math.max(1, weakTopics.length)] || { name: "Temel Kavramlar", subject: "Genel" };
    return {
      day,
      day_number: i + 1,
      subject: targetWeak.subject || "Genel",
      topic: targetWeak.name || "Genel Tekrar",
      task_title: `${targetWeak.name} Konu Özeti & 15 Soru Çözümü`,
      duration_minutes: 45,
      task_type: i < 5 ? "concept_and_practice" : "weekly_review",
      why: `Seviye testinde ${targetWeak.name} konusunda eksik tespit edildi.`,
    };
  });

  return {
    ok: true,
    score,
    net,
    total,
    correct,
    wrong,
    blank,
    success_rate: successRate,
    level: successRate > 70 ? 3 : successRate > 40 ? 2 : 1,
    subjects: Object.values(subjectMap),
    weak_topics: weakTopics,
    roadmap,
    answers,
  };
}

export default function PlacementTest() {
  const [params] = useSearchParams();
  const examId = params.get("exam_id");
  const { user, updateUser, register } = useAuth();
  const nav = useNavigate();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showList, setShowList] = useState(false);

  const [registering, setRegistering] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "" });
  const timerRef = useRef(null);

  // Storage key for state recovery on page refresh
  const storageKey = examId ? `hedefmatik_placement_session_${examId}` : null;

  const loadTest = async () => {
    if (!examId) {
      nav("/onboarding");
      return;
    }
    setLoading(true);
    setLoadError(null);

    try {
      // 1. Check if restored session exists
      if (storageKey) {
        try {
          const saved = sessionStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.test && parsed.test.questions?.length > 0) {
              setTest(parsed.test);
              setAnswers(parsed.answers || {});
              setIdx(parsed.idx || 0);
              setLoading(false);
              return;
            }
          }
        } catch (_) {}
      }

      // 2. Fetch fresh diagnostic test
      const data = await createPlacementTest(examId);
      if (!data || !data.questions || data.questions.length === 0) {
        throw new Error("Bu sınav için henüz soru havuzu hazır değil.");
      }

      setTest(data);
      setAnswers({});
      setIdx(0);
    } catch (err) {
      setLoadError(err.response?.data?.detail || err.message || "Seviye tespit testi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTest();
  }, [examId]);

  // Persist progress
  useEffect(() => {
    if (storageKey && test && !result) {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ test, answers, idx })
        );
      } catch (_) {}
    }
  }, [test, answers, idx, storageKey, result]);

  // Question timer
  useEffect(() => {
    if (!test || result) return;
    setRemaining(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timerRef.current);
          if (idx < test.questions.length - 1) {
            setIdx((i) => i + 1);
          } else {
            handleFinish(true);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [idx, test, result]);

  const select = (qid, opt) => {
    setAnswers((s) => ({ ...s, [qid]: s[qid] === opt ? null : opt }));
  };

  const handleFinish = async (auto = false) => {
    if (!test) return;
    if (!auto) {
      const unanswered = test.questions.length - Object.values(answers).filter(Boolean).length;
      if (unanswered > 0 && !window.confirm(`${unanswered} soruyu boş bıraktın. Testi tamamlayıp sonuçlarını görmek istiyor musun?`)) {
        return;
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    try {
      // Try backend evaluation
      const evaluated = await evaluatePlacementTest({
        exam_id: examId,
        answers,
        time_spent_seconds: (test.questions.length * 60) - remaining,
        user_id: user?.id || null,
      });
      setResult(evaluated);
    } catch (_) {
      // Local fallback calculation
      const localResult = computePlacementResultLocal(test, answers);
      setResult(localResult);
    } finally {
      setSubmitting(false);
      if (storageKey) sessionStorage.removeItem(storageKey);
      if (auto) toast.info("Süre doldu, test otomatik tamamlandı.");
    }
  };

  // If already logged in, save to profile
  const saveToAccount = async () => {
    if (!user?.id || !result) return;
    setSubmitting(true);
    try {
      await savePlacementResult(result, examId, user.id);
      updateUser({ ...user, target_exams: [examId], placement_completed: true });
      toast.success("Seviye ölçümün hesabına kaydedildi!");
      nav("/app");
    } catch {
      toast.error("Kaydedilemedi, lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  // Register + Save
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.email || !regForm.password) {
      return toast.error("Lütfen tüm alanları doldurun.");
    }
    setRegistering(true);
    try {
      const newUser = await register(regForm.name, regForm.email, regForm.password);
      if (newUser?.id) {
        await savePlacementResult(result, examId, newUser.id);
      }
      toast.success("🎉 Hesabın oluşturuldu ve seviye ölçümün kaydedildi!");
      nav("/app");
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Kayıt yapılamadı.");
    } finally {
      setRegistering(false);
    }
  };

  // ============ LOADING & ERROR STATES ============
  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center mx-auto">
            <Loader2 className="animate-spin" size={24} />
          </div>
          <h3 className="font-heading font-bold text-lg text-zinc-900">Seviye Ölçme Testin Hazırlanıyor</h3>
          <p className="text-xs text-zinc-500">
            Ders ve konu dağılımına göre dengeli seviye belirleme soruları seçiliyor...
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !test || !test.questions || test.questions.length === 0) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h3 className="font-heading font-bold text-lg text-zinc-900">Soru Yükleme Durumu</h3>
          <p className="text-xs text-zinc-600 leading-relaxed">
            {loadError || "Seçilen sınav için test soruları hazırlanırken bir problem oluştu."}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={loadTest}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
            >
              <RotateCcw size={15} /> Yeniden Dene
            </button>
            <Link
              to="/onboarding"
              className="w-full py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-bold text-xs transition block"
            >
              Farklı Bir Sınav Seç
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============ RESULT SCREEN ============
  if (result) {
    const items = [
      { label: "Doğru", value: result.correct || 0, color: "#10B981", icon: Check },
      { label: "Yanlış", value: result.wrong || 0, color: "#F43F5E", icon: X },
      { label: "Boş", value: result.blank || 0, color: "#A1A1AA", icon: Target },
      { label: "Net", value: result.net || 0, color: "#4F46E5", icon: Trophy },
    ];

    return (
      <div className="min-h-screen bg-paper py-12 px-4 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE }}>
            <Card className="p-8 text-center relative overflow-hidden bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/40 border-indigo-100">
              <div className="relative">
                <span className="inline-grid place-items-center h-16 w-16 rounded-2xl bg-indigo-600 text-white mb-4 shadow-md shadow-indigo-600/20">
                  <Trophy size={30} />
                </span>
                <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{test.exam_name || "Sınav"} Seviye Ölçüm Raporu</div>
                <div className="font-heading font-extrabold text-5xl sm:text-6xl mt-2 text-zinc-900">{result.score}</div>
                <div className="text-xs text-zinc-500 mt-1 font-medium">Tahmini Başlangıç Puanı · Başarı Oranı %{result.success_rate}</div>
              </div>
            </Card>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {items.map((it, i) => (
              <Card key={it.label} className="p-4 text-center border-zinc-200">
                <span className="inline-grid place-items-center h-8 w-8 rounded-lg mb-1.5" style={{ background: `${it.color}18` }}>
                  <it.icon size={15} style={{ color: it.color }} />
                </span>
                <div className="font-heading font-extrabold text-2xl" style={{ color: it.color }}>{it.value}</div>
                <div className="text-[11px] font-bold text-zinc-500 mt-0.5">{it.label}</div>
              </Card>
            ))}
          </div>

          {/* Eksik Konular Listesi */}
          {result.weak_topics?.length > 0 && (
            <Card className="p-6 border-zinc-200">
              <h2 className="font-heading font-bold text-base text-zinc-900 mb-3 flex items-center gap-2">
                <Target size={18} className="text-indigo-600" /> Tespit Edilen Kritik Eksikler ({result.weak_topics.length} Konu)
              </h2>
              <div className="space-y-2">
                {result.weak_topics.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-150 text-xs">
                    <div>
                      <div className="font-bold text-zinc-800">{t.name}</div>
                      <div className="text-[10px] text-zinc-500 font-medium">{t.subject}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.status === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {t.status === "critical" ? "Kritik Eksik" : "Geliştirilmeli"} (%{t.percentage})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 7 Günlük Yol Haritası Önizlemesi */}
          {result.roadmap?.length > 0 && (
            <Card className="p-6 border-zinc-200">
              <h2 className="font-heading font-bold text-base text-zinc-900 mb-3 flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" /> Sana Özel İlk Hafta Çalışma Yol Haritası
              </h2>
              <div className="space-y-2">
                {result.roadmap.slice(0, 4).map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/40 border border-indigo-100 text-xs">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {r.day_number}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900">{r.day} — {r.task_title}</span>
                        <span className="text-[10px] text-indigo-600 font-bold">{r.duration_minutes} dk</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{r.why}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* CTA & Kayıt Butonu */}
          <div className="pt-2">
            {user ? (
              <button
                disabled={submitting}
                onClick={saveToAccount}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 text-sm transition"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                Kişisel Yol Haritamı Başlat ve Panele Git <ArrowRight size={18} />
              </button>
            ) : (
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 space-y-4">
                <div className="text-center">
                  <h3 className="font-heading font-bold text-lg text-zinc-900">Yol Haritanı Kaydet ve Çalışmaya Başla</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Sonuçlarını kaydetmek ve AI Koçunun günlük çalışma görevlerini açmak için ücretsiz hesabını oluştur.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-3 max-w-md mx-auto">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 block mb-1">Ad Soyad</label>
                    <input
                      required
                      type="text"
                      value={regForm.name}
                      onChange={(e) => setRegForm((s) => ({ ...s, name: e.target.value }))}
                      placeholder="Örn: Ahmet Yılmaz"
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 block mb-1">E-posta Adresi</label>
                    <input
                      required
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm((s) => ({ ...s, email: e.target.value }))}
                      placeholder="ahmet@example.com"
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 block mb-1">Şifre</label>
                    <input
                      required
                      type="password"
                      value={regForm.password}
                      onChange={(e) => setRegForm((s) => ({ ...s, password: e.target.value }))}
                      placeholder="En az 6 karakter"
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <button
                    disabled={registering}
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-indigo-600/20 text-xs transition"
                  >
                    {registering ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                    Ücretsiz Kaydol ve Planımı Aç
                  </button>

                  <div className="text-center text-[11px] text-zinc-500 pt-1">
                    Zaten hesabın var mı?{" "}
                    <Link to="/login" className="font-bold text-indigo-600 hover:underline">
                      Giriş Yap
                    </Link>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ QUESTION SOLVER SCREEN ============
  const q = test.questions[idx];
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const isLast = idx === test.questions.length - 1;

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-4 sm:px-8 py-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-base text-zinc-900">{test.exam_name || "Sınav"}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">Seviye Testi</span>
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Soru {idx + 1} / {test.questions.length}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-zinc-200 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 shadow-sm">
            <Clock size={14} className={remaining < 15 ? "text-red-500 animate-pulse" : "text-indigo-600"} />
            <span className={remaining < 15 ? "text-red-600 font-extrabold" : ""}>{remaining}s</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${((idx + 1) / test.questions.length) * 100}%` }} />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: EASE }}>
            <Card className="p-6 sm:p-8 border-zinc-200 mb-6">
              <p className="font-heading font-semibold text-base sm:text-lg leading-relaxed text-zinc-900 mb-6 whitespace-pre-wrap">
                {q.question_text}
              </p>

              <div className="space-y-2.5">
                {OPTS.filter((o) => q[`option_${o.toLowerCase()}`]).map((o) => {
                  const isSelected = answers[q.id] === o;
                  return (
                    <button
                      key={o}
                      onClick={() => select(q.id, o)}
                      className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <span className={`h-7 w-7 rounded-lg grid place-items-center font-heading font-bold text-xs ${
                        isSelected ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {o}
                      </span>
                      <span className="text-xs sm:text-sm text-zinc-800 font-medium">{q[`option_${o.toLowerCase()}`]}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white font-bold text-xs text-zinc-700 disabled:opacity-40 hover:bg-zinc-50 transition"
          >
            <ChevronLeft size={16} /> Geri
          </button>
          <button
            onClick={() => setShowList(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 font-bold text-xs text-zinc-700 transition"
          >
            <ListChecks size={15} /> {answeredCount}/{test.questions.length} Soru
          </button>
          {isLast ? (
            <button
              disabled={submitting}
              onClick={() => handleFinish(false)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition"
            >
              {submitting ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />} Testi Bitir
            </button>
          ) : (
            <button
              onClick={() => setIdx((i) => Math.min(test.questions.length - 1, i + 1))}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
            >
              İleri <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Question Palette Modal */}
        <AnimatePresence>
          {showList && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setShowList(false)}>
              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto shadow-2xl">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-150">
                  <h3 className="font-heading font-bold text-base text-zinc-900">Soru Listesi ({answeredCount}/{test.questions.length} Cevaplandı)</h3>
                  <button onClick={() => setShowList(false)}><X size={18} className="text-zinc-400" /></button>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                  {test.questions.map((qq, i) => (
                    <button
                      key={qq.id}
                      onClick={() => { setIdx(i); setShowList(false); }}
                      className={`h-10 rounded-xl font-heading font-bold text-xs border-2 transition ${
                        i === idx ? "border-indigo-600 shadow-sm" : "border-transparent"
                      } ${answers[qq.id] ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setShowList(false); handleFinish(false); }} className="mt-6 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition">
                  <Check size={16} /> Testi Tamamla
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
