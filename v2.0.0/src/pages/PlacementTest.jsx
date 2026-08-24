import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronLeft, ChevronRight, Check, X, Loader2, ListChecks, Sparkles, Trophy, ArrowRight, Target, UserPlus, LogIn } from "lucide-react";
import { createPlacementTest, savePlacementResult } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { statusColor, tone } from "@/lib/subjects";
import { Card, EASE } from "@/app/ui";
import { toast } from "sonner";

const OPTS = ["A", "B", "C", "D", "E"];

export default function PlacementTest() {
  const [params] = useSearchParams();
  const examId = params.get("exam_id");
  const { user, updateUser, register } = useAuth();
  const nav = useNavigate();
  const [test, setTest] = useState(null);
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

  useEffect(() => {
    if (!examId) { nav("/"); return; }
    createPlacementTest(examId).then((t) => {
      if (!t) { toast.error("Bu sınav için soru bulunamadı."); nav("/"); return; }
      setTest(t);
    }).catch(() => { toast.error("Soru yüklenemedi."); nav("/"); });
  }, [examId]);

  useEffect(() => {
    if (!test) return;
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
  }, [idx, test]);

  const select = (qid, opt) => {
    setAnswers((s) => ({ ...s, [qid]: s[qid] === opt ? null : opt }));
  };

  const handleFinish = (auto = false) => {
    if (!test) return;
    if (!auto) {
      const unanswered = test.questions.length - Object.values(answers).filter(Boolean).length;
      if (unanswered > 0 && !window.confirm(`${unanswered} soruyu boş bıraktın. Testi bitirmek istiyor musun?`)) return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    const localResult = computePlacementResultLocal(test, answers);
    setResult(localResult);
    if (auto) toast.info("Süre doldu, test otomatik gönderildi.");
  };

  // If already logged in, save results to their account
  const saveToAccount = async () => {
    if (!user?.id || !result) return;
    setSubmitting(true);
    try {
      await savePlacementResult(result, examId, user.id);
      updateUser({ ...user, target_exams: [examId], placement_completed: true });
      toast.success("Sonucun kaydedildi!");
      nav("/app");
    } catch {
      toast.error("Kaydedilemedi, tekrar dene.");
    } finally { setSubmitting(false); }
  };

  // Register + save results
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const newUser = await register(regForm.name, regForm.email, regForm.password);
      if (newUser?.id) {
        await savePlacementResult(result, examId, newUser.id);
      }
      toast.success("Hesabın oluşturuldu ve sonucun kaydedildi!");
      nav("/app");
    } catch (err) {
      toast.error(err.message || "Kayıt yapılamadı.");
    } finally { setRegistering(false); }
  };


  // ============ RESULT SCREEN ============
  if (result) {
    const items = [
      { label: "Doğru", value: result.correct, color: "#10B981", icon: Check },
      { label: "Yanlış", value: result.wrong, color: "#F43F5E", icon: X },
      { label: "Boş", value: result.blank, color: "#A1A1AA", icon: Target },
      { label: "Net", value: result.net, color: "#4F46E5", icon: Trophy },
    ];

    return (
      <div className="min-h-screen bg-paper">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-12">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE }}>
            <Card className="p-8 text-center relative overflow-hidden mb-6">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-subject-matematik/10" />
              <div className="relative">
                <span className="inline-grid place-items-center h-16 w-16 rounded-2xl bg-subject-sosyal/15 mb-4"><Trophy size={30} className="text-subject-sosyal" /></span>
                <div className="text-sm text-zinc-500">Seviye Ölçme Sonucun</div>
                <div className="font-heading font-extrabold text-6xl mt-2 text-subject-matematik">{result.score}</div>
                <div className="text-zinc-400 mt-1">puan · başarı %{result.success_rate}</div>
              </div>
            </Card>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {items.map((it, i) => (
              <motion.div key={it.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06, ease: EASE }}>
                <Card className="p-5 text-center">
                  <span className="inline-grid place-items-center h-9 w-9 rounded-lg mb-2" style={{ background: `${it.color}18` }}>
                    <it.icon size={16} style={{ color: it.color }} />
                  </span>
                  <div className="font-heading font-extrabold text-2xl" style={{ color: it.color }}>{it.value}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{it.label}</div>
                </Card>
              </motion.div>
            ))}
          </div>

          <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
            <Target size={20} className="text-subject-turkce" /> Eksik Konuların
          </h2>
          <div className="space-y-3 mb-8">
            {result.weak_topics.map((t, i) => {
              const sc = statusColor(t.status);
              return (
              <motion.div key={t.topic_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, ease: EASE }}>
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: sc }} />
                        <span className="font-heading font-bold">Konu #{i + 1}</span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">{t.solved} soru · {t.correct} doğru · {t.wrong} yanlış · {t.blank} boş</div>
                    </div>
                    <div className="text-right">
                      <div className="font-heading font-extrabold text-2xl" style={{ color: sc }}>%{t.proficiency}</div>
                      <div className="text-xs font-semibold" style={{ color: sc }}>{t.status}</div>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 overflow-hidden mt-3">
                    <motion.div className="h-full rounded-full" style={{ background: sc }} initial={{ width: 0 }} animate={{ width: `${t.proficiency}%` }} transition={{ duration: 0.8, ease: EASE }} />
                  </div>
                </Card>
              </motion.div>
              );
            })}
          </div>

          {/* CTA: save results */}
          {user ? (
            <button
              onClick={saveToAccount}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-ink text-white font-semibold py-3.5 rounded-xl hover:bg-subject-matematik transition-colors disabled:opacity-60"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <>Sonucumu Kaydet ve Devam Et <ArrowRight size={18} /></>}
            </button>
          ) : (
            <div className="space-y-3">
              {!showRegister ? (
                <>
                  <div className="text-center">
                    <p className="text-zinc-500 text-sm mb-4">Sonucunu kaydetmek ve kişisel çalışma planı almak için ücretsiz hesap oluştur.</p>
                  </div>
                  <button
                    onClick={() => setShowRegister(true)}
                    className="w-full flex items-center justify-center gap-2 bg-ink text-white font-semibold py-3.5 rounded-xl hover:bg-subject-matematik transition-colors"
                  >
                    <UserPlus size={18} /> Ücretsiz Kayıt Ol ve Sonucu Kaydet
                  </button>
                  <Link to="/login" className="w-full flex items-center justify-center gap-2 border border-zinc-300 font-semibold py-3.5 rounded-xl hover:border-ink transition-colors">
                    <LogIn size={18} /> Zaten hesabım var, giriş yap
                  </Link>
                </>
              ) : (
                <Card className="p-6">
                  <h3 className="font-heading font-bold text-lg mb-4">Hesap Oluştur</h3>
                  <form onSubmit={handleRegister} className="space-y-3">
                    <input required placeholder="Ad Soyad" value={regForm.name} onChange={(e) => setRegForm((s) => ({ ...s, name: e.target.value }))} className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-subject-matematik transition" />
                    <input required type="email" placeholder="E-posta" value={regForm.email} onChange={(e) => setRegForm((s) => ({ ...s, email: e.target.value }))} className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-subject-matematik transition" />
                    <input required type="password" placeholder="Şifre (en az 6 karakter)" value={regForm.password} onChange={(e) => setRegForm((s) => ({ ...s, password: e.target.value }))} className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-subject-matematik transition" />
                    <button type="submit" disabled={registering} className="w-full flex items-center justify-center gap-2 bg-ink text-white font-semibold py-3 rounded-xl hover:bg-subject-matematik transition-colors disabled:opacity-60">
                      {registering ? <Loader2 className="animate-spin" size={18} /> : <>Kayıt Ol ve Başla <ArrowRight size={18} /></>}
                    </button>
                  </form>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen grid place-items-center bg-paper">
        <Loader2 className="animate-spin text-subject-matematik" size={32} />
      </div>
    );
  }

  const q = test.questions[idx];
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const low = remaining <= 10;
  const isLast = idx === test.questions.length - 1;

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="h-7 w-7 rounded-lg bg-subject-matematik grid place-items-center"><Sparkles size={14} className="text-white" /></span>
          <span className="font-heading font-extrabold text-lg">Seviye Ölçme Testi</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="font-heading font-bold text-sm">Soru {idx + 1}/{test.questions.length}</div>
          <div className={`flex items-center gap-2 font-heading font-bold text-lg px-3 py-1 rounded-lg ${low ? "bg-subject-turkce/10 text-subject-turkce animate-pulse" : "bg-zinc-100 text-ink"}`}>
            <Clock size={16} /> 00:{String(remaining).padStart(2, "0")}
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden my-4">
          <div className="h-full bg-subject-matematik transition-all" style={{ width: `${((idx + 1) / test.questions.length) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28, ease: EASE }}>
            <p className="font-heading font-semibold text-lg leading-relaxed mb-5">{q.question_text}</p>
            <div className="space-y-3">
              {OPTS.filter((o) => q[`option_${o.toLowerCase()}`]).map((o) => {
                const on = answers[q.id] === o;
                return (
                  <button key={o} onClick={() => select(q.id, o)} data-testid={`option-${o}`}
                    className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${on ? "border-subject-matematik bg-subject-matematik/5" : "border-zinc-200 hover:border-zinc-300"}`}>
                    <span className={`h-8 w-8 rounded-lg grid place-items-center font-heading font-bold text-sm ${on ? "bg-subject-matematik text-white" : "bg-zinc-100 text-zinc-500"}`}>{o}</span>
                    <span className="text-[15px]">{q[`option_${o.toLowerCase()}`]}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3 mt-8">
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-zinc-300 font-medium disabled:opacity-40 hover:border-ink transition-colors">
            <ChevronLeft size={18} /> Geri
          </button>
          <button onClick={() => setShowList(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-100 font-medium text-sm">
            <ListChecks size={16} /> {answeredCount}/{test.questions.length}
          </button>
          {isLast ? (
            <button onClick={() => handleFinish(false)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-subject-fen text-white font-semibold hover:opacity-90 transition-opacity">
              <Check size={17} /> Bitir
            </button>
          ) : (
            <button onClick={() => setIdx((i) => i + 1)} className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-ink text-white font-medium hover:bg-subject-matematik transition-colors">
              İleri <ChevronRight size={18} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {showList && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setShowList(false)}>
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[70vh] overflow-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-bold text-lg">Soru Listesi</h3>
                  <button onClick={() => setShowList(false)}><X size={20} className="text-zinc-400" /></button>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {test.questions.map((qq, i) => (
                    <button key={qq.id} onClick={() => { setIdx(i); setShowList(false); }}
                      className={`h-10 rounded-lg font-heading font-bold text-sm border-2 ${i === idx ? "border-ink" : "border-transparent"} ${answers[qq.id] ? "bg-subject-matematik text-white" : "bg-zinc-100 text-zinc-500"}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button onClick={() => handleFinish(false)} className="mt-6 w-full flex items-center justify-center gap-2 bg-subject-fen text-white font-semibold py-3 rounded-xl">
                  <Check size={17} /> Testi Bitir
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
