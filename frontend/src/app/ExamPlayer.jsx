import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flag, ChevronLeft, ChevronRight, Check, X, Loader2, ListChecks } from "lucide-react";
import api from "@/lib/api";
import { Spinner, EASE } from "@/app/ui";
import { toast } from "sonner";

const OPTS = ["A", "B", "C", "D", "E"];

export default function ExamPlayer() {
  const { testId } = useParams();
  const nav = useNavigate();
  const [test, setTest] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [endAt, setEndAt] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showList, setShowList] = useState(false);
  const timeRef = useRef({});
  const lsKey = `netor_session_${testId}`;

  // load test + resume/start session
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: t } = await api.get(`/tests/${testId}`);
      if (!mounted) return;
      const saved = JSON.parse(localStorage.getItem(lsKey) || "null");
      if (saved && saved.sessionId) {
        setSessionId(saved.sessionId);
        setAnswers(saved.answers || {});
        setMarked(saved.marked || {});
        setEndAt(saved.endAt);
        timeRef.current = saved.time || {};
      } else {
        const { data: s } = await api.post(`/tests/${testId}/start`);
        const end = Date.now() + t.duration_minutes * 60 * 1000;
        setSessionId(s.id);
        setEndAt(end);
        localStorage.setItem(lsKey, JSON.stringify({ sessionId: s.id, answers: {}, marked: {}, endAt: end, time: {} }));
      }
      setTest(t);
    })();
    return () => { mounted = false; };
  }, [testId]);

  const persist = useCallback((next = {}) => {
    localStorage.setItem(lsKey, JSON.stringify({
      sessionId, answers, marked, endAt, time: timeRef.current, ...next,
    }));
  }, [sessionId, answers, marked, endAt, lsKey]);

  // countdown
  useEffect(() => {
    if (!endAt) return;
    const iv = setInterval(() => {
      const r = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) { clearInterval(iv); handleSubmit(true); }
    }, 1000);
    return () => clearInterval(iv);
  }, [endAt]); // eslint-disable-line

  // per-question time tracking
  useEffect(() => {
    if (!test) return;
    const qid = test.questions[idx]?.id;
    const iv = setInterval(() => {
      timeRef.current[qid] = (timeRef.current[qid] || 0) + 1;
    }, 1000);
    return () => clearInterval(iv);
  }, [idx, test]);

  const select = (qid, opt) => {
    const next = { ...answers, [qid]: answers[qid] === opt ? null : opt };
    setAnswers(next);
    persist({ answers: next });
  };
  const toggleMark = (qid) => {
    const next = { ...marked, [qid]: !marked[qid] };
    setMarked(next);
    persist({ marked: next });
  };

  const handleSubmit = async (auto = false) => {
    if (submitting || !sessionId || !test) return;
    if (!auto) {
      const unanswered = test.questions.length - Object.values(answers).filter(Boolean).length;
      if (unanswered > 0 && !window.confirm(`${unanswered} soruyu boş bıraktın. Denemeyi bitirmek istiyor musun?`)) return;
    }
    setSubmitting(true);
    const payload = {
      answers: test.questions.map((q) => ({
        question_id: q.id,
        selected_answer: answers[q.id] || null,
        time_spent: timeRef.current[q.id] || 0,
      })),
    };
    try {
      const { data } = await api.post(`/sessions/${sessionId}/submit`, payload);
      localStorage.removeItem(lsKey);
      if (auto) toast.info("Süre doldu, deneme otomatik gönderildi.");
      nav("/app/sonuc", { state: { result: data } });
    } catch {
      toast.error("Gönderilemedi, tekrar dene.");
      setSubmitting(false);
    }
  };

  if (!test) return <Spinner />;

  const q = test.questions[idx];
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const low = remaining <= 60;

  return (
    <div className="max-w-3xl mx-auto">
      {/* sticky header */}
      <div className="sticky top-16 lg:top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 glass border-b border-zinc-200 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs text-zinc-400 truncate">{test.name}</div>
          <div className="font-heading font-bold text-sm">Soru {idx + 1}/{test.questions.length}</div>
        </div>
        <div className={`flex items-center gap-2 font-heading font-bold text-lg px-3 py-1 rounded-lg ${low ? "bg-subject-turkce/10 text-subject-turkce animate-pulse" : "bg-zinc-100 text-ink"}`} data-testid="exam-timer">
          <Clock size={16} /> {mm}:{ss}
        </div>
      </div>

      {/* progress */}
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden my-5">
        <div className="h-full bg-subject-matematik transition-all" style={{ width: `${((idx + 1) / test.questions.length) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28, ease: EASE }}>
          <div className="flex items-start justify-between gap-4 mb-5">
            <p className="font-heading font-semibold text-lg leading-relaxed" data-testid="question-text">{q.question_text}</p>
            <button onClick={() => toggleMark(q.id)} data-testid="mark-question" className={`shrink-0 h-9 w-9 rounded-lg grid place-items-center border transition-colors ${marked[q.id] ? "bg-subject-sosyal/15 border-subject-sosyal text-subject-sosyal" : "border-zinc-300 text-zinc-400"}`}>
              <Flag size={16} />
            </button>
          </div>

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

      {/* nav */}
      <div className="flex items-center justify-between gap-3 mt-8">
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} data-testid="prev-q" className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-zinc-300 font-medium disabled:opacity-40 hover:border-ink transition-colors">
          <ChevronLeft size={18} /> Geri
        </button>
        <button onClick={() => setShowList((s) => !s)} data-testid="toggle-list" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-100 font-medium text-sm">
          <ListChecks size={16} /> {answeredCount}/{test.questions.length}
        </button>
        {idx < test.questions.length - 1 ? (
          <button onClick={() => setIdx((i) => i + 1)} data-testid="next-q" className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-ink text-white font-medium hover:bg-subject-matematik transition-colors">
            İleri <ChevronRight size={18} />
          </button>
        ) : (
          <button onClick={() => handleSubmit(false)} disabled={submitting} data-testid="submit-exam" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-subject-fen text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
            {submitting ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />} Bitir
          </button>
        )}
      </div>

      {/* question list drawer */}
      <AnimatePresence>
        {showList && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 grid place-items-end sm:place-items-center" onClick={() => setShowList(false)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-lg max-h-[70vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg">Soru Listesi</h3>
                <button onClick={() => setShowList(false)}><X size={20} className="text-zinc-400" /></button>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {test.questions.map((qq, i) => {
                  const ans = !!answers[qq.id];
                  const mk = !!marked[qq.id];
                  return (
                    <button key={qq.id} onClick={() => { setIdx(i); setShowList(false); }} data-testid={`goto-q-${i}`}
                      className={`h-10 rounded-lg font-heading font-bold text-sm border-2 relative ${i === idx ? "border-ink" : "border-transparent"} ${ans ? "bg-subject-matematik text-white" : "bg-zinc-100 text-zinc-500"}`}>
                      {i + 1}
                      {mk && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-subject-sosyal" />}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => handleSubmit(false)} disabled={submitting} className="mt-6 w-full flex items-center justify-center gap-2 bg-subject-fen text-white font-semibold py-3 rounded-xl">
                {submitting ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />} Denemeyi bitir
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
